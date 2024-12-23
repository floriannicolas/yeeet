use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher, EventKind};
use std::path::Path;
use tauri::AppHandle;
use tauri::Emitter;
use regex::Regex;


pub fn watch_screenshots(app: AppHandle) -> notify::Result<()> {
    let screenshots_path = std::env::var("HOME")
        .map(|home| Path::new(&home).join("Desktop"))
        .unwrap_or_else(|_| Path::new("/").to_path_buf());

    let time_pattern = Regex::new(r"\d{2}\.\d{2}\.\d{2}\.png$").unwrap();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, _>| {
            // println!("Event received: {:?}", res);
            if let Ok(event) = res {
                if let EventKind::Create(_) = event.kind {
                    for path in event.paths {
                        if let Some(ext) = path.extension() {
                            if let Some(ext_str) = ext.to_str() {
                                if ["png"].contains(&ext_str) && time_pattern.is_match(path.file_name().unwrap().to_str().unwrap()) {
                                    println!("Emitting screenshot-created event for path: {:?}", path);
                                    if let Some(path_str) = path.to_str() {
                                        if let Err(e) = app.emit("screenshot-created", path_str) {
                                            println!("Error emitting event: {:?}", e);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        Config::default().with_poll_interval(std::time::Duration::from_secs(1)),
    )?;

    watcher.watch(
        screenshots_path.as_ref(),
        RecursiveMode::Recursive
    )?;

    // Garder le watcher en vie
    Box::leak(Box::new(watcher));

    Ok(())
}