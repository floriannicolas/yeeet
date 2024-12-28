import pg from 'pg';
import { pgTable, serial, text, varchar, timestamp, integer, bigint, uniqueIndex, AnyPgColumn } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';

import type { InferSelectModel } from 'drizzle-orm';
import { SQL, sql } from 'drizzle-orm';

const USER_STORAGE_LIMIT = 50 * 1024 * 1024; // 50 MB en bytes

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  storageLimit: bigint('storage_limit', { mode: 'number' }).default(USER_STORAGE_LIMIT).notNull()
}, (table) => ({
     emailUniqueIndex: uniqueIndex('emailUniqueIndex').on(lower(table.email)),
}));

export function lower(email: AnyPgColumn): SQL {
  return sql`lower(${email})`;
}

export const sessionsTable = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => usersTable.id),
	expiresAt: timestamp("expires_at", {
		withTimezone: true,
		mode: "date"
	}).notNull()
});

export const filesTable = pgTable('files', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => usersTable.id),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 255 }).notNull(),
  s3Path: varchar('s3_path', { length: 255 }),
  mimeType: varchar('mime_type', { length: 255 }),
  size: bigint('size', { mode: 'number' }),
  downloadToken: varchar('download_token', { length: 64 }).unique(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}); 

export const cronJobsTable = pgTable('cron_jobs', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id),
  token: varchar('token', { length: 64 })
    .notNull()
    .unique(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
    mode: "date"
  }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  usedAt: timestamp('used_at')
});

export type User = InferSelectModel<typeof usersTable>;
export type Session = InferSelectModel<typeof sessionsTable>;
export type File = InferSelectModel<typeof filesTable>;
export type CronJob = InferSelectModel<typeof cronJobsTable>;
export type PasswordResetToken = InferSelectModel<typeof passwordResetTokensTable>;