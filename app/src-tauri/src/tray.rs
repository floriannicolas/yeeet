// Copyright 2019-2024 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

#![cfg(all(desktop, not(test)))]

use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager, Runtime,
};
use tauri_plugin_positioner::{WindowExt, Position};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
  let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
  let menu1 = Menu::with_items(
    app,
    &[
      &quit_i,
    ],
  )?;

  let _ = TrayIconBuilder::with_id("tray-1")
    .tooltip("Tauri")
    .icon(app.default_window_icon().unwrap().clone())
    .menu(&menu1)
    .menu_on_left_click(false)
    .on_menu_event(move |app, event| match event.id.as_ref() {
      "quit" => {
        app.exit(0);
      }
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window("main") {
          tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
          let _ = window.move_window(Position::TrayBottomCenter).unwrap();
          if window.is_visible().unwrap_or_default() {
            let _ = window.hide();
          } else {
            let _ = window.show().unwrap();
            let _ = window.set_focus().unwrap();
          }
        }
      }
    })
    .build(app);

  Ok(())
}