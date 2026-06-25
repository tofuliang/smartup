pub mod action;
pub mod models;
pub mod native_messaging;
pub mod packaging;
pub mod platform;
pub mod processor;

use crate::models::HelperRequest;
use crate::models::HelperResponse;
use serde_json::Value;
use std::env;

pub const HELPER_VERSION: &str = env!("CARGO_PKG_VERSION");

pub fn startup_version_payload() -> Vec<u8> {
    format!(r#"{{"version":"{}"}}"#, HELPER_VERSION).into_bytes()
}

pub fn debug_logging_enabled() -> bool {
    matches!(env::var("SMARTUP_HELPER_DEBUG").ok().as_deref(), Some("1" | "true" | "TRUE" | "yes" | "YES" | "on" | "ON"))
}

pub fn debug_log(message: impl AsRef<str>) {
    if debug_logging_enabled() {
        eprintln!("{}", message.as_ref());
    }
}

pub fn request_log_label(request: &HelperRequest) -> &'static str {
    if request.click.is_some() && request.key.is_some() {
        "click+key"
    } else if request.click.is_some() {
        "click"
    } else if request.key.is_some() {
        "key"
    } else {
        "unknown"
    }
}

pub fn response_log_summary(response: &HelperResponse) -> String {
    let mut parts = Vec::new();

    if let Some(value) = response.crash {
        parts.push(format!("crash={value}"));
    }
    if let Some(value) = response.traceback.as_deref() {
        parts.push(format!("traceback={value}"));
    }

    if let Some(value) = response.resp.get("clicked").and_then(Value::as_bool) {
        parts.push(format!("clicked={value}"));
    }
    if let Some(value) = response.resp.get("keypressed").and_then(Value::as_bool) {
        parts.push(format!("keypressed={value}"));
    }
    if let Some(value) = response
        .resp
        .get("accessibilityRequired")
        .and_then(Value::as_bool)
    {
        parts.push(format!("accessibilityRequired={value}"));
    }
    if let Some(value) = response
        .resp
        .get("accessibilityGranted")
        .and_then(Value::as_bool)
    {
        parts.push(format!("accessibilityGranted={value}"));
    }
    if let Some(value) = response.resp.get("error").and_then(Value::as_str) {
        parts.push(format!("error={value}"));
    }

    if parts.is_empty() {
        "no-flags".to_string()
    } else {
        parts.join(" ")
    }
}
