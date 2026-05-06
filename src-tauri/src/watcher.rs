use crate::notes::NotesStore;
use notify::event::{EventKind, ModifyKind, RenameMode};
use notify::{RecursiveMode, Watcher};
use notify_debouncer_full::new_debouncer;
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

pub fn spawn(store: Arc<NotesStore>, dir: &Path) {
    let dir = dir.to_path_buf();
    std::thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        let mut debouncer = match new_debouncer(Duration::from_millis(200), None, tx) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("watcher init failed: {e}");
                return;
            }
        };
        if let Err(e) = debouncer.watcher().watch(&dir, RecursiveMode::Recursive) {
            eprintln!("watcher watch failed on {}: {e}", dir.display());
            return;
        }

        for res in rx {
            match res {
                Ok(events) => {
                    for ev in events {
                        match ev.event.kind {
                            EventKind::Create(_)
                            | EventKind::Modify(ModifyKind::Data(_))
                            | EventKind::Modify(ModifyKind::Any)
                            | EventKind::Modify(ModifyKind::Name(RenameMode::To)) => {
                                for p in &ev.event.paths {
                                    store.upsert_from_disk(p);
                                }
                            }
                            EventKind::Remove(_)
                            | EventKind::Modify(ModifyKind::Name(RenameMode::From)) => {
                                for p in &ev.event.paths {
                                    store.remove(p);
                                }
                            }
                            _ => {}
                        }
                    }
                }
                Err(errors) => {
                    for e in errors {
                        eprintln!("watcher error: {e}");
                    }
                }
            }
        }
    });
}
