use crate::action::{ActionError, ActionHandler};

#[derive(Debug, Default)]
pub struct PlatformActionHandler;

impl PlatformActionHandler {
    pub fn new() -> Self {
        Self
    }
}

impl ActionHandler for PlatformActionHandler {
    fn accessibility_granted(&self) -> bool {
        false
    }

    fn prompt_accessibility(&mut self) -> bool {
        false
    }

    fn right_click(&mut self, _x: i32, _y: i32, _double_click: bool) -> Result<(), ActionError> {
        Err(super::backend_unavailable("right_click"))
    }

    fn press_keys(&mut self, _modifiers: &[String], _keys: &[String]) -> Result<(), ActionError> {
        Err(super::backend_unavailable("press_keys"))
    }
}
