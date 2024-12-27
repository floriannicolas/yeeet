import pg from 'pg';
import { pgTable, serial, text, varchar, timestamp, integer, bigint, uniqueIndex, AnyPgColumn } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';

import type { InferSelectModel } from 'drizzle-orm';
import { SQL, sql } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
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

export type User = InferSelectModel<typeof usersTable>;
export type Session = InferSelectModel<typeof sessionsTable>;
export type File = InferSelectModel<typeof filesTable>;