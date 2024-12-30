import { defineConfig } from 'bumpp'
import tauri from 'tauri-version'

export default defineConfig({
  execute: tauri(),
});