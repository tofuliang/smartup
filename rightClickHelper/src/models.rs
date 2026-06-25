use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct ClickRequest {
    pub x: i32,
    pub y: i32,
    pub b: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct KeyRequest {
    #[serde(rename = "mod")]
    pub mod_: Vec<String>,
    pub keys: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
pub struct HelperRequest {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub click: Option<ClickRequest>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key: Option<KeyRequest>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub struct HelperResponse {
    pub id: u64,
    pub ack: Value,
    pub resp: Value,
    pub timestamp: i64,
    pub delay: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub crash: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub traceback: Option<String>,
}
