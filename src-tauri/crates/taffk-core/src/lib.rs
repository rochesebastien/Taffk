//! Taffk's data layer, shared by the desktop app (Tauri), the CLI and the MCP
//! server. Everything here talks to the single local SQLite file; the callers
//! only differ in how they are driven (IPC, argv, JSON-RPC).

pub mod db;
pub mod models;
pub mod ops;
pub mod paths;

pub use db::Db;
pub use rusqlite;
