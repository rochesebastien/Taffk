use std::path::PathBuf;

/// Bundle identifier from `tauri.conf.json`; the app stores its data under
/// `<platform data dir>/<identifier>/taffk.db`.
pub const APP_IDENTIFIER: &str = "com.taffk.app";
pub const DB_FILE_NAME: &str = "taffk.db";

/// Environment variable that overrides the database location (CLI/MCP only).
pub const DB_ENV_VAR: &str = "TAFFK_DB";

/// Platform data directory, mirroring Tauri's `app_data_dir()` so the CLI and
/// the MCP server open the very same file as the desktop app:
/// Linux `~/.local/share`, macOS `~/Library/Application Support`,
/// Windows `%APPDATA%` (Roaming).
pub fn app_data_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|d| d.join(APP_IDENTIFIER))
}

/// Resolve the database path: explicit argument, then `TAFFK_DB`, then the
/// platform default.
pub fn resolve_db_path(explicit: Option<PathBuf>) -> Option<PathBuf> {
    explicit
        .or_else(|| std::env::var_os(DB_ENV_VAR).map(PathBuf::from))
        .or_else(|| app_data_dir().map(|d| d.join(DB_FILE_NAME)))
}
