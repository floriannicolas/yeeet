"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES = void 0;
exports.cleanupExpiredFiles = cleanupExpiredFiles;
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const storage_1 = require("../services/storage");
exports.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES = 'cleanup_expired_files';
async function cleanupExpiredFiles() {
    const storageProvider = (0, storage_1.createStorageProvider)();
    try {
        const expiredFiles = await database_1.db.select()
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.lt)(schema_1.filesTable.expiresAt, new Date()));
        for (const file of expiredFiles) {
            try {
                const filePath = process.env.VERCEL
                    ? path_1.default.join('/tmp', file.filePath)
                    : path_1.default.join(__dirname, '../../uploads', file.filePath);
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                }
                if (file.s3Path) {
                    await storageProvider.deleteFile(file.s3Path);
                }
                await database_1.db.delete(schema_1.filesTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.filesTable.id, file.id));
                console.log(`Deleted expired file: ${file.originalName}`);
            }
            catch (error) {
                console.error(`Error deleting file ${file.originalName}:`, error);
            }
        }
    }
    catch (error) {
        console.error('Error in cleanup task:', error);
    }
}
//# sourceMappingURL=cleanup.js.map