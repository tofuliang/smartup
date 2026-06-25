#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
mod unsupported;

#[cfg(target_os = "linux")]
pub use linux::PlatformActionHandler;
#[cfg(target_os = "macos")]
pub use macos::PlatformActionHandler;
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
pub use unsupported::PlatformActionHandler;

pub(crate) fn backend_unavailable(action: &str) -> crate::action::ActionError {
    crate::action::ActionError::BackendUnavailable(format!(
        "{action} is not wired to a native input backend in the Rust helper yet"
    ))
}
