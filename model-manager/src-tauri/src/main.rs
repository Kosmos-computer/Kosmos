// Arco Models — Tauri backend.
//
// Responsibilities:
//   1. Supervise `llama-server` in router mode (spawn/kill, health, log streaming).
//   2. Download GGUF files from Hugging Face with progress events.
//   3. Proxy the router's management + inference API (avoids webview CORS).
//   4. One-click write of Arco's data/settings.json to point at this engine.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures_util::StreamExt;
use serde::Serialize;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

const ENGINE_PORT: u16 = 4650;

// ── Paths ────────────────────────────────────────────────────────────────────

/// Everything (engine config + models) lives under one user-level dir so the
/// same layout works in `tauri dev` and a packaged app.
fn root_dir() -> PathBuf {
    dirs::data_dir()
        .expect("no data dir")
        .join("arco-models")
}

fn models_dir() -> PathBuf {
    root_dir().join("models")
}

fn preset_path() -> PathBuf {
    root_dir().join("presets.ini")
}

/// The llama-server binary: env override first, then Homebrew, then PATH.
fn engine_binary() -> String {
    if let Ok(p) = std::env::var("ARCO_LLAMA_SERVER") {
        return p;
    }
    let brew = "/opt/homebrew/bin/llama-server";
    if std::path::Path::new(brew).exists() {
        return brew.to_string();
    }
    "llama-server".to_string()
}

/// Repo root at compile time (model-manager/src-tauri → two levels up).
/// Good enough for the monorepo prototype; a packaged app would make this a setting.
fn arco_repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .expect("repo root")
        .to_path_buf()
}

// ── Engine supervision ───────────────────────────────────────────────────────

struct EngineState {
    child: Mutex<Option<Child>>,
}

#[derive(Serialize, Clone)]
struct EngineStatus {
    running: bool,
    pid: Option<u32>,
    port: u16,
    binary: String,
    #[serde(rename = "modelsDir")]
    models_dir: String,
}

#[derive(Serialize, Clone)]
struct LogLine {
    line: String,
}

fn stream_logs<R: std::io::Read + Send + 'static>(app: tauri::AppHandle, reader: R) {
    std::thread::spawn(move || {
        let buf = BufReader::new(reader);
        for line in buf.lines().map_while(Result::ok) {
            let _ = app.emit("engine-log", LogLine { line });
        }
    });
}

#[tauri::command]
fn engine_start(
    app: tauri::AppHandle,
    state: State<EngineState>,
    preset_ini: String,
    models_max: u32,
) -> Result<EngineStatus, String> {
    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            return engine_status_inner(true, child.id());
        }
    }

    std::fs::create_dir_all(models_dir()).map_err(|e| e.to_string())?;
    std::fs::write(preset_path(), preset_ini).map_err(|e| e.to_string())?;

    let mut child = Command::new(engine_binary())
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(ENGINE_PORT.to_string())
        .arg("--models-dir")
        .arg(models_dir())
        .arg("--models-preset")
        .arg(preset_path())
        .arg("--models-max")
        .arg(models_max.to_string())
        .arg("--jinja")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start llama-server: {e}"))?;

    if let Some(out) = child.stdout.take() {
        stream_logs(app.clone(), out);
    }
    if let Some(err) = child.stderr.take() {
        stream_logs(app.clone(), err);
    }

    let pid = child.id();
    *guard = Some(child);
    engine_status_inner(true, pid)
}

#[tauri::command]
fn engine_stop(state: State<EngineState>) -> Result<EngineStatus, String> {
    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    engine_status_inner(false, 0)
}

#[tauri::command]
fn engine_status(state: State<EngineState>) -> Result<EngineStatus, String> {
    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    match guard.as_mut() {
        Some(child) => match child.try_wait().map_err(|e| e.to_string())? {
            // Still running.
            None => {
                let pid = child.id();
                engine_status_inner(true, pid)
            }
            // Exited on its own — clear the slot.
            Some(_) => {
                *guard = None;
                engine_status_inner(false, 0)
            }
        },
        None => engine_status_inner(false, 0),
    }
}

fn engine_status_inner(running: bool, pid: u32) -> Result<EngineStatus, String> {
    Ok(EngineStatus {
        running,
        pid: if running { Some(pid) } else { None },
        port: ENGINE_PORT,
        binary: engine_binary(),
        models_dir: models_dir().to_string_lossy().to_string(),
    })
}

// ── Router API proxy ─────────────────────────────────────────────────────────
// The webview calls the router through this command instead of fetch() so we
// never fight CORS, and long generations aren't subject to webview timeouts.

#[tauri::command]
async fn engine_api(
    method: String,
    path: String,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let url = format!("http://127.0.0.1:{ENGINE_PORT}{path}");
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let req = match method.as_str() {
        "GET" => client.get(&url),
        "POST" => {
            let r = client.post(&url);
            match body {
                Some(b) => r.json(&b),
                None => r,
            }
        }
        "DELETE" => client.delete(&url),
        m => return Err(format!("unsupported method {m}")),
    };

    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    let value: serde_json::Value =
        serde_json::from_str(&text).unwrap_or(serde_json::Value::String(text));

    if status.is_success() {
        Ok(value)
    } else {
        Err(format!("HTTP {status}: {value}"))
    }
}

// ── Model files ──────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct LocalModel {
    file: String,
    #[serde(rename = "sizeBytes")]
    size_bytes: u64,
}

#[tauri::command]
fn list_local_models() -> Result<Vec<LocalModel>, String> {
    let dir = models_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".gguf") {
            let meta = entry.metadata().map_err(|e| e.to_string())?;
            out.push(LocalModel {
                file: name,
                size_bytes: meta.len(),
            });
        }
    }
    out.sort_by(|a, b| a.file.cmp(&b.file));
    Ok(out)
}

#[derive(Serialize, Clone)]
struct DownloadProgress {
    file: String,
    received: u64,
    total: Option<u64>,
    done: bool,
    error: Option<String>,
}

#[tauri::command]
async fn download_model(app: tauri::AppHandle, url: String, file: String) -> Result<(), String> {
    let dir = models_dir();
    tokio::fs::create_dir_all(&dir).await.map_err(|e| e.to_string())?;
    let final_path = dir.join(&file);
    let part_path = dir.join(format!("{file}.part"));

    if final_path.exists() {
        return Ok(());
    }

    let emit = |p: DownloadProgress| {
        let _ = app.emit("download-progress", p);
    };

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    let total = res.content_length();
    let mut stream = res.bytes_stream();
    let mut out = tokio::fs::File::create(&part_path)
        .await
        .map_err(|e| e.to_string())?;
    let mut received: u64 = 0;
    let mut last_emit = std::time::Instant::now();

    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(c) => c,
            Err(e) => {
                let msg = e.to_string();
                emit(DownloadProgress {
                    file: file.clone(),
                    received,
                    total,
                    done: false,
                    error: Some(msg.clone()),
                });
                let _ = tokio::fs::remove_file(&part_path).await;
                return Err(msg);
            }
        };
        out.write_all(&chunk).await.map_err(|e| e.to_string())?;
        received += chunk.len() as u64;
        // Throttle progress events to ~5/sec; a 2 GB file would otherwise flood the IPC bridge.
        if last_emit.elapsed().as_millis() > 200 {
            last_emit = std::time::Instant::now();
            emit(DownloadProgress {
                file: file.clone(),
                received,
                total,
                done: false,
                error: None,
            });
        }
    }
    out.flush().await.map_err(|e| e.to_string())?;
    drop(out);

    tokio::fs::rename(&part_path, &final_path)
        .await
        .map_err(|e| e.to_string())?;
    emit(DownloadProgress {
        file,
        received,
        total,
        done: true,
        error: None,
    });
    Ok(())
}

#[tauri::command]
fn delete_model(file: String) -> Result<(), String> {
    // Only allow deleting plain .gguf files inside our models dir.
    if file.contains('/') || file.contains("..") || !file.ends_with(".gguf") {
        return Err("invalid file name".into());
    }
    let path = models_dir().join(&file);
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

// ── Arco integration ─────────────────────────────────────────────────────────

/// Merge provider/baseUrl/model into Arco's data/settings.json (creating it if
/// missing) so the OS immediately talks to this engine.
#[tauri::command]
fn configure_arco(model: String) -> Result<String, String> {
    let settings_path = arco_repo_root().join("data").join("settings.json");
    let mut settings: serde_json::Value = match std::fs::read_to_string(&settings_path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or_else(|_| serde_json::json!({})),
        Err(_) => serde_json::json!({}),
    };
    let obj = settings
        .as_object_mut()
        .ok_or("settings.json is not an object")?;
    obj.insert("provider".into(), "local".into());
    obj.insert(
        "baseUrl".into(),
        format!("http://127.0.0.1:{ENGINE_PORT}/v1").into(),
    );
    // llama-server ignores API keys; keep any existing key so switching back
    // to a cloud provider later doesn't require re-entering it.
    if !obj.contains_key("apiKey") {
        obj.insert("apiKey".into(), "local".into());
    }
    obj.insert("model".into(), model.into());

    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(
        &settings_path,
        serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    Ok(settings_path.to_string_lossy().to_string())
}

// ── Entry ────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .manage(EngineState {
            child: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            engine_start,
            engine_stop,
            engine_status,
            engine_api,
            list_local_models,
            download_model,
            delete_model,
            configure_arco
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            // Take the engine down with the app; orphaned llama-server children
            // would otherwise keep multi-GB models resident.
            if let tauri::RunEvent::Exit = event {
                let state: State<EngineState> = app.state();
                let child = state.child.lock().ok().and_then(|mut g| g.take());
                if let Some(mut child) = child {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}
