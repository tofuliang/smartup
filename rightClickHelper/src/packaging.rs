use std::path::{Path, PathBuf};

pub const APP_NAME: &str = "smartUp.app";
pub const EXECUTABLE_NAME: &str = "smartUpRightClickHelper";
pub const APP_ICON_FILE_NAME: &str = "AppIcon.icns";

pub fn macos_bundle_output_path(helper_root: &Path, arch: &str) -> PathBuf {
    helper_root
        .join("dist")
        .join(format!("darwin_{arch}"))
        .join(APP_NAME)
}

pub fn macos_install_app_path(home: Option<&Path>, is_root: bool) -> PathBuf {
    if is_root {
        PathBuf::from("/Applications").join(APP_NAME)
    } else {
        home.expect("non-root macOS installs require HOME")
            .join("Applications")
            .join(APP_NAME)
    }
}

pub fn native_host_executable_path(app_path: &Path) -> PathBuf {
    app_path
        .join("Contents")
        .join("MacOS")
        .join(EXECUTABLE_NAME)
}

pub fn app_icon_file_name() -> &'static str {
    APP_ICON_FILE_NAME
}
