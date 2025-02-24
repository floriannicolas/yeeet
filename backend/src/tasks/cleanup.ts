import { lt, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../config/database';
import { filesTable } from '../db/schema';
import { createStorageProvider } from '../services/storage';

export const CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES = 'cleanup_expired_files';

export async function cleanupExpiredFiles(): Promise<void> {
  const storageProvider = createStorageProvider();
  try {
    const expiredFiles = await db
      .select()
      .from(filesTable)
      .where(lt(filesTable.expiresAt, new Date()));

    for (const file of expiredFiles) {
      try {
        const filePath = process.env.VERCEL
          ? path.join('/tmp', file.filePath)
          : path.join(__dirname, '../../uploads', file.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        if (file.s3Path) {
          await storageProvider.deleteFile(file.s3Path);
        }

        await db.delete(filesTable).where(eq(filesTable.id, file.id));

        console.log(`Deleted expired file: ${file.originalName}`);
      } catch (error) {
        console.error(`Error deleting file ${file.originalName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cleanup task:', error);
  }
}
