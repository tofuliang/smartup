use smartup_right_click_helper::action::{ActionError, ActionHandler};
use smartup_right_click_helper::models::HelperRequest;
use smartup_right_click_helper::native_messaging::{read_frame, write_frame};
use smartup_right_click_helper::packaging::{
    app_icon_file_name, macos_bundle_output_path, macos_install_app_path,
    native_host_executable_path,
};
use smartup_right_click_helper::processor::parse_error_response;
use smartup_right_click_helper::processor::RequestProcessor;
use smartup_right_click_helper::{
    debug_logging_enabled, request_log_label, response_log_summary, startup_version_payload,
    HELPER_VERSION,
};
use std::io::Cursor;
use std::path::PathBuf;
use temp_env::with_var;

#[derive(Default)]
struct FakeHandler {
    granted: bool,
    prompt_result: bool,
    prompt_calls: usize,
    clicks: Vec<(i32, i32, bool)>,
    key_presses: Vec<(Vec<String>, Vec<String>)>,
}

struct FailingHandler {
    granted: bool,
}

impl ActionHandler for FailingHandler {
    fn accessibility_granted(&self) -> bool {
        self.granted
    }

    fn prompt_accessibility(&mut self) -> bool {
        self.granted
    }

    fn right_click(&mut self, _x: i32, _y: i32, _double_click: bool) -> Result<(), ActionError> {
        Err(ActionError::BackendUnavailable(
            "linux x11 backend unavailable".to_string(),
        ))
    }

    fn press_keys(&mut self, _modifiers: &[String], _keys: &[String]) -> Result<(), ActionError> {
        Err(ActionError::BackendUnavailable(
            "linux x11 backend unavailable".to_string(),
        ))
    }
}

impl ActionHandler for FakeHandler {
    fn accessibility_granted(&self) -> bool {
        self.granted
    }

    fn prompt_accessibility(&mut self) -> bool {
        self.prompt_calls += 1;
        self.prompt_result
    }

    fn right_click(&mut self, x: i32, y: i32, double_click: bool) -> Result<(), ActionError> {
        self.clicks.push((x, y, double_click));
        Ok(())
    }

    fn press_keys(&mut self, modifiers: &[String], keys: &[String]) -> Result<(), ActionError> {
        self.key_presses.push((modifiers.to_vec(), keys.to_vec()));
        Ok(())
    }
}

#[test]
fn write_frame_uses_chrome_native_messaging_little_endian_length_prefix() {
    let mut out = Vec::new();
    let payload = startup_version_payload();

    write_frame(&mut out, &payload).expect("frame write should succeed");

    assert_eq!(&out[..4], &(payload.len() as u32).to_le_bytes());
    assert_eq!(&out[4..], payload.as_slice());
}

#[test]
fn read_frame_reads_exactly_one_length_prefixed_payload() {
    let payload = br#"{"timestamp":1}"#;
    let mut framed = Vec::new();
    framed.extend_from_slice(&(payload.len() as u32).to_le_bytes());
    framed.extend_from_slice(payload);
    framed.extend_from_slice(b"trailing");

    let got = read_frame(Cursor::new(framed)).expect("frame read should succeed");

    assert_eq!(got, payload);
}

#[test]
fn helper_request_deserializes_legacy_click_and_key_fields() {
    let req: HelperRequest = serde_json::from_str(
        r#"{"timestamp":123,"click":{"x":10,"y":20,"b":2},"key":{"mod":["ctrl"],"keys":["c"]}}"#,
    )
    .expect("legacy request should parse");

    let click = req.click.expect("click should parse");
    assert_eq!((click.x, click.y, click.b), (10, 20, 2));
    let key = req.key.expect("key should parse");
    assert_eq!(key.mod_, vec!["ctrl"]);
    assert_eq!(key.keys, vec!["c"]);
}

#[test]
fn process_returns_accessibility_diagnostic_without_dispatching_actions() {
    let mut processor = RequestProcessor::new();
    let mut handler = FakeHandler::default();
    let payload = br#"{"timestamp":1000,"click":{"x":10,"y":20,"b":1}}"#;

    let response = processor
        .process(payload, 7, 1200, &mut handler)
        .expect("request should parse")
        .expect("diagnostic response should be sent");

    assert_eq!(response.id, 7);
    assert_eq!(response.delay, 200);
    assert_eq!(response.resp["accessibilityRequired"], true);
    assert_eq!(response.resp["accessibilityGranted"], false);
    assert_eq!(handler.prompt_calls, 1);
    assert!(handler.clicks.is_empty());
}

#[test]
fn repeated_untrusted_requests_only_prompt_once_per_handler_instance() {
    let mut processor = RequestProcessor::new();
    let mut handler = FakeHandler::default();
    let payload = br#"{"timestamp":1000,"click":{"x":10,"y":20,"b":1}}"#;
    let second_payload = br#"{"timestamp":1300,"click":{"x":30,"y":40,"b":1}}"#;

    let first = processor
        .process(payload, 21, 1200, &mut handler)
        .expect("first request should parse")
        .expect("first diagnostic response should be sent");
    let second = processor
        .process(second_payload, 22, 1500, &mut handler)
        .expect("second request should parse")
        .expect("second diagnostic response should be sent");

    assert_eq!(first.resp["accessibilityRequired"], true);
    assert_eq!(first.resp["accessibilityGranted"], false);
    assert_eq!(second.resp["accessibilityRequired"], true);
    assert_eq!(second.resp["accessibilityGranted"], false);
    assert_eq!(handler.prompt_calls, 1);
}

#[test]
fn process_dispatches_clicks_and_keys_when_accessibility_is_granted() {
    let mut processor = RequestProcessor::new();
    let mut handler = FakeHandler {
        granted: true,
        ..FakeHandler::default()
    };
    let payload =
        br#"{"timestamp":1000,"click":{"x":10,"y":20,"b":2},"key":{"mod":["ctrl"],"keys":["c"]}}"#;

    let response = processor
        .process(payload, 8, 1300, &mut handler)
        .expect("request should parse")
        .expect("action response should be sent");

    assert_eq!(handler.clicks, vec![(10, 20, false)]);
    assert_eq!(
        handler.key_presses,
        vec![(vec!["ctrl".to_string()], vec!["c".to_string()])]
    );
    assert_eq!(response.resp["clicked"], true);
    assert_eq!(response.resp["keypressed"], true);
    assert_eq!(
        response.ack,
        serde_json::json!({
            "timestamp": 1000,
            "click": {"x": 10, "y": 20, "b": 2},
            "key": {"mod": ["ctrl"], "keys": ["c"]}
        })
    );
}

#[test]
fn right_button_click_is_not_interpreted_as_double_click() {
    let mut processor = RequestProcessor::new();
    let mut handler = FakeHandler {
        granted: true,
        ..FakeHandler::default()
    };
    let payload = br#"{"timestamp":1000,"click":{"x":742,"y":524,"b":2}}"#;

    let response = processor
        .process(payload, 42, 1100, &mut handler)
        .expect("request should parse")
        .expect("action response should be sent");

    assert_eq!(handler.clicks, vec![(742, 524, false)]);
    assert_eq!(response.resp["clicked"], true);
}

#[test]
fn process_does_not_dispatch_stale_actions() {
    let mut processor = RequestProcessor::new();
    let mut handler = FakeHandler {
        granted: true,
        ..FakeHandler::default()
    };
    let payload =
        br#"{"timestamp":3000,"click":{"x":10,"y":20,"b":1},"key":{"mod":[],"keys":["esc"]}}"#;

    let response = processor
        .process(payload, 9, 6001, &mut handler)
        .expect("request should parse")
        .expect("stale response should be sent");

    assert!(handler.clicks.is_empty());
    assert!(handler.key_presses.is_empty());
    assert_eq!(response.resp["clicked"], false);
    assert_eq!(response.resp["keypressed"], false);
}

#[test]
fn process_suppresses_follow_up_messages_within_two_hundred_millis() {
    let mut processor = RequestProcessor::new();
    let mut handler = FakeHandler {
        granted: true,
        ..FakeHandler::default()
    };

    processor
        .process(
            br#"{"timestamp":1000,"click":{"x":1,"y":2,"b":1}}"#,
            10,
            1100,
            &mut handler,
        )
        .expect("first request should parse")
        .expect("first request should respond");

    let response = processor
        .process(
            br#"{"timestamp":1100,"click":{"x":3,"y":4,"b":1}}"#,
            11,
            1150,
            &mut handler,
        )
        .expect("second request should parse");

    assert!(response.is_none());
    assert_eq!(handler.clicks, vec![(1, 2, false)]);
}

#[test]
fn process_preserves_native_contract_when_backend_action_fails() {
    let mut processor = RequestProcessor::new();
    let mut handler = FailingHandler { granted: true };
    let payload =
        br#"{"timestamp":1000,"click":{"x":10,"y":20,"b":2},"key":{"mod":["ctrl"],"keys":["c"]}}"#;

    let response = processor
        .process(payload, 12, 1200, &mut handler)
        .expect("request should parse")
        .expect("failure response should be sent");

    assert_eq!(response.id, 12);
    assert_eq!(response.resp["clicked"], false);
    assert_eq!(response.resp["keypressed"], false);
    assert!(response.resp["error"]
        .as_str()
        .expect("error should be string")
        .contains("linux x11 backend unavailable"));
}

#[test]
fn invalid_json_request_returns_structured_error_frame() {
    let payload = br#"{invalid json"#;

    let response = parse_error_response(payload, 13, 1_700_000_000_000, "expected value");

    assert_eq!(response.id, 13);
    assert_eq!(response.timestamp, 1_700_000_000_000);
    assert_eq!(response.delay, 0);
    assert_eq!(response.crash, Some(true));
    assert_eq!(response.resp, serde_json::json!({}));
    assert_eq!(response.ack, serde_json::json!("{invalid json"));
    assert!(response.traceback
        .as_deref()
        .expect("traceback should be string")
        .contains("expected value"));
}

#[test]
fn macos_bundle_output_path_is_stable_under_dist_for_arch() {
    let root = PathBuf::from("/repo/rightClickHelper");

    let output = macos_bundle_output_path(&root, "arm64");

    assert_eq!(
        output,
        PathBuf::from("/repo/rightClickHelper/dist/darwin_arm64/smartUp.app")
    );
}

#[test]
fn macos_install_app_path_uses_stable_applications_location() {
    let user_home = PathBuf::from("/Users/alice");

    assert_eq!(
        macos_install_app_path(Some(&user_home), false),
        PathBuf::from("/Users/alice/Applications/smartUp.app")
    );
    assert_eq!(
        macos_install_app_path(None, true),
        PathBuf::from("/Applications/smartUp.app")
    );
}

#[test]
fn native_host_executable_path_points_inside_app_bundle() {
    let app_path = PathBuf::from("/Users/alice/Applications/smartUp.app");

    let executable = native_host_executable_path(&app_path);

    assert_eq!(
        executable,
        PathBuf::from(
            "/Users/alice/Applications/smartUp.app/Contents/MacOS/smartUpRightClickHelper"
        )
    );
}

#[test]
fn app_icon_file_name_matches_bundle_resource_name() {
    assert_eq!(app_icon_file_name(), "AppIcon.icns");
}

#[test]
fn startup_version_frame_matches_current_helper_version() {
    let mut out = Vec::new();
    let payload = startup_version_payload();

    write_frame(&mut out, &payload).expect("frame write should succeed");

    assert_eq!(
        String::from_utf8(payload).expect("startup payload should be valid utf-8"),
        format!(r#"{{"version":"{}"}}"#, HELPER_VERSION)
    );
    assert_eq!(
        std::str::from_utf8(&out[4..]).expect("framed payload should be valid utf-8"),
        format!(r#"{{"version":"{}"}}"#, HELPER_VERSION)
    );
}

#[test]
fn request_log_label_prefers_click_and_key_shape() {
    let click_only: HelperRequest = serde_json::from_str(
        r#"{"timestamp":1,"click":{"x":1,"y":2,"b":1}}"#,
    )
    .expect("click request should parse");
    let key_only: HelperRequest =
        serde_json::from_str(r#"{"timestamp":1,"key":{"mod":["ctrl"],"keys":["c"]}}"#)
            .expect("key request should parse");
    let click_and_key: HelperRequest = serde_json::from_str(
        r#"{"timestamp":1,"click":{"x":1,"y":2,"b":1},"key":{"mod":["ctrl"],"keys":["c"]}}"#,
    )
    .expect("combo request should parse");
    let unknown: HelperRequest = serde_json::from_str(r#"{"timestamp":1}"#)
        .expect("unknown request should parse");

    assert_eq!(request_log_label(&click_only), "click");
    assert_eq!(request_log_label(&key_only), "key");
    assert_eq!(request_log_label(&click_and_key), "click+key");
    assert_eq!(request_log_label(&unknown), "unknown");
}

#[test]
fn response_log_summary_captures_action_and_accessibility_flags() {
    let request: HelperRequest = serde_json::from_str(
        r#"{"timestamp":1,"click":{"x":1,"y":2,"b":1}}"#,
    )
    .expect("request should parse");

    let response = smartup_right_click_helper::models::HelperResponse {
        id: 7,
        ack: serde_json::to_value(request).expect("request should serialize"),
        resp: serde_json::json!({
            "clicked": false,
            "accessibilityRequired": true,
            "accessibilityGranted": false,
            "error": "action backend unavailable: demo"
        }),
        timestamp: 1,
        delay: 2,
        crash: None,
        traceback: None,
    };

    assert_eq!(
        response_log_summary(&response),
        "clicked=false accessibilityRequired=true accessibilityGranted=false error=action backend unavailable: demo"
    );
}

#[test]
fn response_log_summary_includes_parse_error_crash_details() {
    let response = parse_error_response(br#"{invalid json"#, 13, 1_700_000_000_000, "expected value");

    assert_eq!(
        response_log_summary(&response),
        "crash=true traceback=expected value"
    );
}

#[test]
fn debug_logging_is_disabled_by_default_and_enabled_by_env() {
    with_var("SMARTUP_HELPER_DEBUG", None::<&str>, || {
        assert!(!debug_logging_enabled());
    });

    with_var("SMARTUP_HELPER_DEBUG", Some("1"), || {
        assert!(debug_logging_enabled());
    });
}
