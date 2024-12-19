import { pgTable, serial, varchar, timestamp, integer, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 255 }),
  size: bigint('size', { mode: 'number' }),
  downloadToken: varchar('download_token', { length: 64 }).unique(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}); 