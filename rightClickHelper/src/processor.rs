use crate::action::ActionHandler;
use crate::models::{HelperRequest, HelperResponse};
use serde_json::{Map, Value};

const STALE_ACTION_MILLIS: i64 = 2_000;

#[derive(Debug, Default)]
pub struct RequestProcessor {
    last_message_timestamp: Option<i64>,
    accessibility_prompted: bool,
}

impl RequestProcessor {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn process<H: ActionHandler>(
        &mut self,
        payload: &[u8],
        message_id: u64,
        now_millis: i64,
        handler: &mut H,
    ) -> Result<Option<HelperResponse>, serde_json::Error> {
        let request: HelperRequest = serde_json::from_slice(payload)?;

        if let (Some(last), Some(current)) = (self.last_message_timestamp, request.timestamp) {
            if current - last < 200 {
                self.last_message_timestamp = None;
                return Ok(None);
            }
        }
        self.last_message_timestamp = request.timestamp;

        let delay = request
            .timestamp
            .map(|timestamp| now_millis - timestamp)
            .unwrap_or(0);

        let needs_accessibility = request.click.is_some() || request.key.is_some();
        let mut resp = Map::new();

        if needs_accessibility && !handler.accessibility_granted() {
            let prompted = if self.accessibility_prompted {
                false
            } else {
                let prompted = handler.prompt_accessibility();
                self.accessibility_prompted = true;
                prompted
            };
            resp.insert("accessibilityGranted".to_string(), Value::Bool(prompted));
            resp.insert("accessibilityRequired".to_string(), Value::Bool(true));

            if !prompted {
                return Ok(Some(Self::response(
                    message_id, request, resp, now_millis, delay,
                )));
            }
        } else if needs_accessibility {
            self.accessibility_prompted = false;
        }

        if let Some(click) = &request.click {
            if delay > STALE_ACTION_MILLIS {
                resp.insert("clicked".to_string(), Value::Bool(false));
            } else {
                match handler.right_click(click.x, click.y, false) {
                    Ok(()) => {
                        resp.insert("clicked".to_string(), Value::Bool(true));
                    }
                    Err(err) => {
                        resp.insert("clicked".to_string(), Value::Bool(false));
                        resp.insert("error".to_string(), Value::String(err.to_string()));
                    }
                }
            }
        }

        if let Some(key) = &request.key {
            if delay > STALE_ACTION_MILLIS {
                resp.insert("keypressed".to_string(), Value::Bool(false));
            } else {
                match handler.press_keys(&key.mod_, &key.keys) {
                    Ok(()) => {
                        resp.insert("keypressed".to_string(), Value::Bool(true));
                    }
                    Err(err) => {
                        resp.insert("keypressed".to_string(), Value::Bool(false));
                        resp.insert("error".to_string(), Value::String(err.to_string()));
                    }
                }
            }
        }

        Ok(Some(Self::response(
            message_id, request, resp, now_millis, delay,
        )))
    }

    fn response(
        id: u64,
        ack: HelperRequest,
        resp: Map<String, Value>,
        timestamp: i64,
        delay: i64,
    ) -> HelperResponse {
        HelperResponse {
            id,
            ack: serde_json::to_value(ack)
                .expect("HelperRequest should serialize into response ack"),
            resp: Value::Object(resp),
            timestamp,
            delay,
            crash: None,
            traceback: None,
        }
    }
}

pub fn parse_error_response(
    payload: &[u8],
    message_id: u64,
    now_millis: i64,
    error_message: &str,
) -> HelperResponse {
    HelperResponse {
        id: message_id,
        ack: Value::String(String::from_utf8_lossy(payload).into_owned()),
        resp: Value::Object(Map::new()),
        timestamp: now_millis,
        delay: 0,
        crash: Some(true),
        traceback: Some(error_message.to_string()),
    }
}
