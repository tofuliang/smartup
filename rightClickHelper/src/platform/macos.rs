use crate::action::{ActionError, ActionHandler};
use crate::debug_log;
use std::ffi::CString;
use std::process::Command;

extern "C" {
    fn smartup_ax_trusted() -> i32;
    fn smartup_ax_prompt() -> i32;
    fn smartup_right_click(x: f64, y: f64, click_count: i32) -> i32;
    fn smartup_key_press(modifiers_csv: *const std::os::raw::c_char, key_name: *const std::os::raw::c_char) -> i32;
}

#[derive(Debug, Default)]
pub struct PlatformActionHandler;

impl PlatformActionHandler {
    pub fn new() -> Self {
        Self
    }
}

fn click_count(double_click: bool) -> i32 {
    if double_click { 2 } else { 1 }
}

fn modifiers_csv(modifiers: &[String]) -> Result<CString, ActionError> {
    CString::new(modifiers.join(",")).map_err(|_| ActionError::BackendUnavailable("invalid modifier sequence for macOS backend".to_string()))
}

fn key_cstring(key: &str) -> Result<CString, ActionError> {
    CString::new(key).map_err(|_| ActionError::BackendUnavailable("invalid key sequence for macOS backend".to_string()))
}

impl ActionHandler for PlatformActionHandler {
    fn accessibility_granted(&self) -> bool {
        let granted = unsafe { smartup_ax_trusted() == 1 };
        debug_log(format!("[debug] macos accessibility granted={granted}"));
        granted
    }

    fn prompt_accessibility(&mut self) -> bool {
        debug_log("[debug] macos accessibility prompt requested");
        let granted = unsafe { smartup_ax_prompt() == 1 };
        debug_log(format!("[debug] macos accessibility prompt result granted={granted}"));
        if !granted {
            debug_log("[debug] opening macos accessibility settings pane");
            let _ = Command::new("open")
                .arg(
                    "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
                )
                .status();
        }
        granted
    }

    fn right_click(&mut self, x: i32, y: i32, double_click: bool) -> Result<(), ActionError> {
        debug_log(format!(
            "[debug] macos right_click x={x} y={y} double_click={double_click}"
        ));
        if unsafe { smartup_right_click(x as f64, y as f64, click_count(double_click)) == 1 } {
            debug_log("[debug] macos right_click result=ok");
            Ok(())
        } else {
            debug_log("[debug] macos right_click result=error");
            Err(super::backend_unavailable("right_click"))
        }
    }

    fn press_keys(&mut self, modifiers: &[String], keys: &[String]) -> Result<(), ActionError> {
        debug_log(format!(
            "[debug] macos press_keys modifiers={:?} keys={:?}",
            modifiers, keys
        ));

        let modifiers_csv = modifiers_csv(modifiers)?;
        for key in keys {
            let key_name = key_cstring(key)?;
            if unsafe { smartup_key_press(modifiers_csv.as_ptr(), key_name.as_ptr()) != 1 } {
                debug_log(format!("[debug] macos press_keys result=error key={key}"));
                return Err(super::backend_unavailable("press_keys"));
            }
        }

        debug_log("[debug] macos press_keys result=ok");
        Ok(())
    }
}
