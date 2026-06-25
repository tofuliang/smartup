use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ActionError {
    #[error("action backend unavailable: {0}")]
    BackendUnavailable(String),
}

pub trait ActionHandler {
    fn accessibility_granted(&self) -> bool;
    fn prompt_accessibility(&mut self) -> bool;
    fn right_click(&mut self, x: i32, y: i32, double_click: bool) -> Result<(), ActionError>;
    fn press_keys(&mut self, modifiers: &[String], keys: &[String]) -> Result<(), ActionError>;
}
