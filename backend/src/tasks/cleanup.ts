import { db } from '../database';
import { filesTable } from '../db/schema';
import { lt, eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function cleanupExpiredFiles() {
  try {
    // Récupérer tous les fichiers expirés
    const expiredFiles = await db.select()
      .from(filesTable)
      .where(lt(filesTable.expiresAt, new Date()));

    for (const file of expiredFiles) {
      try {
        // Supprimer le fichier physique
        const filePath = path.join(__dirname, '../../uploads', file.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Supprimer l'entrée de la base de données
        await db.delete(filesTable)
          .where(eq(filesTable.id, file.id));

        console.log(`Deleted expired file: ${file.originalName}`);
      } catch (error) {
        console.error(`Error deleting file ${file.originalName}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in cleanup task:', error);
  }
} 