use smartup_right_click_helper::native_messaging::{read_frame, write_frame};
use smartup_right_click_helper::platform::PlatformActionHandler;
use smartup_right_click_helper::processor::{parse_error_response, RequestProcessor};
use smartup_right_click_helper::{
    debug_log, request_log_label, response_log_summary, startup_version_payload, HELPER_VERSION,
};
use std::io::{self, Write};
use std::time::{SystemTime, UNIX_EPOCH};

fn main() {
    let mut stdout = io::stdout().lock();
    let startup_payload = startup_version_payload();
    debug_log(format!("[debug] startup version: {HELPER_VERSION}"));
    if let Err(err) = write_frame(&mut stdout, &startup_payload) {
        let _ = writeln!(
            io::stderr(),
            "[error] failed to send startup message: {err}"
        );
        return;
    }
    let _ = stdout.flush();

    let stdin = io::stdin();
    let mut stdin = stdin.lock();
    let mut processor = RequestProcessor::new();
    let mut handler = PlatformActionHandler::new();
    let mut message_id = 1_u64;

    loop {
        let payload = match read_frame(&mut stdin) {
            Ok(payload) => payload,
            Err(err) if err.kind() == io::ErrorKind::UnexpectedEof => break,
            Err(err) => {
                let _ = writeln!(io::stderr(), "[error] failed to read native message: {err}");
                break;
            }
        };

        message_id += 1;
        match serde_json::from_slice::<smartup_right_click_helper::models::HelperRequest>(&payload) {
            Ok(request) => {
                debug_log(format!(
                    "[debug] received request {} type={} bytes={} payload={}",
                    message_id,
                    request_log_label(&request),
                    payload.len(),
                    String::from_utf8_lossy(&payload)
                ));
            }
            Err(_) => {
                debug_log(format!(
                    "[debug] received request {} type=unparseable bytes={}",
                    message_id,
                    payload.len()
                ));
            }
        }

        match processor.process(&payload, message_id, now_millis(), &mut handler) {
            Ok(Some(response)) => match serde_json::to_vec(&response) {
                Ok(response_payload) => {
                    debug_log(format!(
                        "[debug] sending response {} bytes={} summary={}",
                        response.id,
                        response_payload.len(),
                        response_log_summary(&response)
                    ));
                    if let Err(err) = write_frame(&mut stdout, &response_payload) {
                        let _ = writeln!(io::stderr(), "[error] failed to send response: {err}");
                        break;
                    }
                    let _ = stdout.flush();
                }
                Err(err) => {
                    let _ = writeln!(io::stderr(), "[error] failed to encode response: {err}");
                }
            },
            Ok(None) => {
                debug_log(format!("[debug] suppressed duplicate request {}", message_id));
            }
            Err(err) => {
                let _ = writeln!(io::stderr(), "[error] failed to parse request: {err}");
                let response = parse_error_response(&payload, message_id, now_millis(), &err.to_string());
                match serde_json::to_vec(&response) {
                    Ok(response_payload) => {
                        debug_log(format!(
                            "[debug] sending parse error response {} bytes={} summary={}",
                            response.id,
                            response_payload.len(),
                            response_log_summary(&response)
                        ));
                        if let Err(err) = write_frame(&mut stdout, &response_payload) {
                            let _ = writeln!(io::stderr(), "[error] failed to send parse error response: {err}");
                            break;
                        }
                        let _ = stdout.flush();
                    }
                    Err(err) => {
                        let _ = writeln!(io::stderr(), "[error] failed to encode parse error response: {err}");
                    }
                }
            }
        }
    }
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
