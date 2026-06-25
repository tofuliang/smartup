use crate::action::{ActionError, ActionHandler};
use std::env;
use std::process::Command;

#[derive(Debug, Default)]
pub struct PlatformActionHandler;

impl PlatformActionHandler {
    pub fn new() -> Self {
        Self
    }
}

fn linux_backend_unavailable(reason: impl Into<String>) -> ActionError {
    ActionError::BackendUnavailable(format!("linux x11 backend unavailable: {}", reason.into()))
}

fn map_key_name(key: &str) -> String {
    match key.to_ascii_lowercase().as_str() {
        "cmd" | "command" | "meta" | "super" => "Super".to_string(),
        "ctrl" | "control" => "ctrl".to_string(),
        "alt" | "option" => "alt".to_string(),
        "shift" => "shift".to_string(),
        "esc" | "escape" => "Escape".to_string(),
        "space" => "space".to_string(),
        "enter" | "return" => "Return".to_string(),
        _ => key.to_string(),
    }
}

fn right_click_args(x: i32, y: i32, double_click: bool) -> Vec<String> {
    let mut args = vec![
        "mousemove".to_string(),
        x.to_string(),
        y.to_string(),
        "click".to_string(),
    ];
    if double_click {
        args.push("--repeat".to_string());
        args.push("2".to_string());
    }
    args.push("3".to_string());
    args
}

fn key_args(modifiers: &[String], keys: &[String]) -> Vec<Vec<String>> {
    let mods: Vec<String> = modifiers.iter().map(|key| map_key_name(key)).collect();
    keys.iter()
        .map(|key| {
            let mut combo = mods.clone();
            combo.push(map_key_name(key));
            vec!["key".to_string(), combo.join("+")]
        })
        .collect()
}

fn x11_session_available() -> bool {
    let has_display = env::var_os("DISPLAY").is_some();
    let session_type = env::var("XDG_SESSION_TYPE").unwrap_or_default();
    has_display && !session_type.eq_ignore_ascii_case("wayland")
}

fn xdotool_available() -> bool {
    Command::new("xdotool")
        .arg("--version")
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

fn run_xdotool(args: &[String]) -> Result<(), ActionError> {
    let status = Command::new("xdotool")
        .args(args)
        .status()
        .map_err(|err| linux_backend_unavailable(format!("failed to spawn xdotool: {err}")))?;

    if status.success() {
        Ok(())
    } else {
        Err(linux_backend_unavailable(format!(
            "xdotool exited with status {status}"
        )))
    }
}

impl ActionHandler for PlatformActionHandler {
    fn accessibility_granted(&self) -> bool {
        true
    }

    fn prompt_accessibility(&mut self) -> bool {
        true
    }

    fn right_click(&mut self, x: i32, y: i32, double_click: bool) -> Result<(), ActionError> {
        if !x11_session_available() {
            return Err(linux_backend_unavailable("DISPLAY/X11 session unavailable"));
        }
        if !xdotool_available() {
            return Err(linux_backend_unavailable("xdotool is not installed"));
        }
        run_xdotool(&right_click_args(x, y, double_click))
    }

    fn press_keys(&mut self, modifiers: &[String], keys: &[String]) -> Result<(), ActionError> {
        if !x11_session_available() {
            return Err(linux_backend_unavailable("DISPLAY/X11 session unavailable"));
        }
        if !xdotool_available() {
            return Err(linux_backend_unavailable("xdotool is not installed"));
        }

        for args in key_args(modifiers, keys) {
            run_xdotool(&args)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use temp_env::with_vars;

    #[test]
    fn right_click_command_moves_mouse_and_clicks_right_button_once() {
        let args = right_click_args(10, 20, false);

        assert_eq!(
            args,
            vec![
                "mousemove".to_string(),
                "10".to_string(),
                "20".to_string(),
                "click".to_string(),
                "3".to_string(),
            ]
        );
    }

    #[test]
    fn right_click_command_uses_repeat_two_for_double_click() {
        let args = right_click_args(10, 20, true);

        assert_eq!(
            args,
            vec![
                "mousemove".to_string(),
                "10".to_string(),
                "20".to_string(),
                "click".to_string(),
                "--repeat".to_string(),
                "2".to_string(),
                "3".to_string(),
            ]
        );
    }

    #[test]
    fn key_command_joins_modifiers_and_keys_using_xdotool_key_syntax() {
        let args = key_args(
            &["ctrl".to_string(), "shift".to_string()],
            &["c".to_string()],
        );

        assert_eq!(
            args,
            vec![vec!["key".to_string(), "ctrl+shift+c".to_string()]]
        );
    }

    #[test]
    fn key_command_maps_legacy_names_to_xdotool_names() {
        let args = key_args(&["cmd".to_string()], &["esc".to_string()]);

        assert_eq!(
            args,
            vec![vec!["key".to_string(), "Super+Escape".to_string()]]
        );
    }

    #[test]
    fn x11_session_is_available_when_display_exists_and_wayland_is_not_current_session() {
        with_vars(
            vec![
                ("DISPLAY", Some(":0")),
                ("XDG_SESSION_TYPE", Some("x11")),
                ("WAYLAND_DISPLAY", None),
            ],
            || {
                assert!(x11_session_available());
            },
        );
    }

    #[test]
    fn x11_session_is_unavailable_for_wayland_without_x11_session_type() {
        with_vars(
            vec![
                ("DISPLAY", None),
                ("XDG_SESSION_TYPE", Some("wayland")),
                ("WAYLAND_DISPLAY", Some("wayland-0")),
            ],
            || {
                assert!(!x11_session_available());
            },
        );
    }

    #[test]
    fn right_click_returns_backend_unavailable_when_x11_is_missing() {
        with_vars(
            vec![
                ("DISPLAY", None),
                ("XDG_SESSION_TYPE", None),
                ("WAYLAND_DISPLAY", None),
            ],
            || {
                let mut handler = PlatformActionHandler::new();
                let err = handler
                    .right_click(10, 20, false)
                    .expect_err("missing X11 should fail");

                assert!(err.to_string().contains("linux x11 backend unavailable"));
            },
        );
    }

    #[test]
    fn press_keys_returns_backend_unavailable_when_x11_is_missing() {
        with_vars(
            vec![
                ("DISPLAY", None),
                ("XDG_SESSION_TYPE", None),
                ("WAYLAND_DISPLAY", None),
            ],
            || {
                let mut handler = PlatformActionHandler::new();
                let err = handler
                    .press_keys(&["ctrl".to_string()], &["c".to_string()])
                    .expect_err("missing X11 should fail");

                assert!(err.to_string().contains("linux x11 backend unavailable"));
            },
        );
    }
}
