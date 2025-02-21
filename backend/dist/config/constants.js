"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_PREFIX = exports.TAURI_URL_DEV = exports.TAURI_URL = exports.CLIENT_URL = exports.BACKEND_URL = void 0;
exports.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
exports.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
exports.TAURI_URL = process.env.TAURI_URL || 'tauri://localhost';
exports.TAURI_URL_DEV = process.env.TAURI_URL_DEV || 'http://localhost:1420';
exports.API_PREFIX = '/api';
//# sourceMappingURL=constants.js.map