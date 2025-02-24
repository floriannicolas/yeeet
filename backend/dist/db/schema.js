"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetTokensTable = exports.cronJobsTable = exports.filesTable = exports.sessionsTable = exports.usersTable = void 0;
exports.lower = lower;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const USER_STORAGE_LIMIT = 50 * 1024 * 1024; // 50 MB en bytes
exports.usersTable = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    username: (0, pg_core_1.varchar)('username', { length: 255 }).notNull().unique(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    password: (0, pg_core_1.varchar)('password', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    storageLimit: (0, pg_core_1.bigint)('storage_limit', { mode: 'number' }).default(USER_STORAGE_LIMIT).notNull(),
    lastAppVersion: (0, pg_core_1.varchar)('last_app_version', { length: 255 }),
}, (table) => ({
    emailUniqueIndex: (0, pg_core_1.uniqueIndex)('emailUniqueIndex').on(lower(table.email)),
}));
function lower(email) {
    return (0, drizzle_orm_1.sql) `lower(${email})`;
}
exports.sessionsTable = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(() => exports.usersTable.id),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', {
        withTimezone: true,
        mode: 'date',
    }).notNull(),
});
exports.filesTable = (0, pg_core_1.pgTable)('files', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id').references(() => exports.usersTable.id),
    originalName: (0, pg_core_1.varchar)('original_name', { length: 255 }).notNull(),
    filePath: (0, pg_core_1.varchar)('file_path', { length: 255 }).notNull(),
    s3Path: (0, pg_core_1.varchar)('s3_path', { length: 255 }),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 255 }),
    size: (0, pg_core_1.bigint)('size', { mode: 'number' }),
    downloadToken: (0, pg_core_1.varchar)('download_token', { length: 64 }).unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.cronJobsTable = (0, pg_core_1.pgTable)('cron_jobs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    type: (0, pg_core_1.varchar)('type', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.passwordResetTokensTable = (0, pg_core_1.pgTable)('password_reset_tokens', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(() => exports.usersTable.id),
    token: (0, pg_core_1.varchar)('token', { length: 64 }).notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', {
        withTimezone: true,
        mode: 'date',
    }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    usedAt: (0, pg_core_1.timestamp)('used_at'),
});
//# sourceMappingURL=schema.js.map