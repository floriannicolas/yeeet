"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFileSize = formatFileSize;
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${Math.round(size)} ${units[unitIndex]}`;
}
//# sourceMappingURL=format.js.map