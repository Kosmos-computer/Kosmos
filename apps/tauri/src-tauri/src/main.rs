// Arco OS — Tauri shell prototype.
//
// Loads the shared Vite-built UI. In dev, points at the root Vite server.
// Mobile builds report kind=mobile so the shell mounts MobileShell.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlatformInfo {
    kind: &'static str,
    os: &'static str,
    version: String,
    api_base: Option<String>,
}

fn shell_kind() -> &'static str {
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        "mobile"
    }
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        "desktop"
    }
}

fn platform_os() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "darwin"
    }
    #[cfg(target_os = "windows")]
    {
        "win32"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
    #[cfg(target_os = "android")]
    {
        "android"
    }
    #[cfg(target_os = "ios")]
    {
        "ios"
    }
    #[cfg(not(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "android",
        target_os = "ios"
    )))]
    {
        "web"
    }
}

#[tauri::command]
fn platform_info() -> PlatformInfo {
    PlatformInfo {
        kind: shell_kind(),
        os: platform_os(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        api_base: std::env::var("ARCO_API_URL").ok(),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![platform_info])
        .run(tauri::generate_context!())
        .expect("error while running Arco Tauri shell");
}
