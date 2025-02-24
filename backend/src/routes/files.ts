import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { eq, and, desc } from 'drizzle-orm';
import { Readable } from 'stream';
import { db } from '../config/database';
import { filesTable } from '../db/schema';
import { getTokenFromRequest, validateSessionToken } from '../session';
import {
  convertImageToWebp,
  createStorageProvider,
  getUniqueFilename,
  UPLOAD_DIR,
} from '../services/storage';
import { UserStorageService } from '../services/user-storage';
import { formatFileSize } from '../lib/formatters';
import mime from 'mime-types';
import { BACKEND_URL, API_PREFIX } from '../config/constants';
import { generateRandomToken } from '../lib/tokens';
import { requireAuth } from '../middleware/auth';

const storageProvider = createStorageProvider();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let userId = -1;
    const token = getTokenFromRequest(req);
    if (token) {
      const { user } = await validateSessionToken(token);
      if (!user || !user.id) {
        return cb(new Error('User not authenticated'), '');
      }
      userId = user.id;
    } else {
      return cb(new Error('User not authenticated'), '');
    }
    const metadata = JSON.parse(decodeURIComponent(file.originalname));
    const userDir = path.join(UPLOAD_DIR, userId.toString());
    const dir = path.join(userDir, metadata.uploadId);

    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const metadata = JSON.parse(decodeURIComponent(file.originalname));
    cb(null, `chunk_${metadata.index}`);
  },
});
const upload = multer({ storage });

const router = Router();

router.get('/download/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.downloadToken, req.params.token)))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const file = result[0];

    res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    const fileContent = await storageProvider.getFile(file.s3Path || file.filePath, file.filePath);
    if (fileContent instanceof Readable) {
      fileContent.pipe(res);
    } else {
      res.send(fileContent);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

router.get('/view/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.downloadToken, req.params.token)))
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const file = result[0];

    const viewableMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/avif',
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
    ];

    if (!viewableMimeTypes.includes(file.mimeType ?? '')) {
      res.redirect(`${BACKEND_URL}${API_PREFIX}/download/${file.downloadToken}`);
      return;
    }

    res.setHeader('Content-Type', file.mimeType ?? '');
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    const fileContent = await storageProvider.getFile(file.s3Path || file.filePath, file.filePath);
    if (fileContent instanceof Readable) {
      fileContent.pipe(res);
    } else {
      res.send(fileContent);
    }
  } catch (error) {
    console.error('Error viewing file:', error);
    res.status(500).json({ message: 'Error viewing file' });
  }
});

router.post(
  '/upload',
  requireAuth,
  upload.single('chunk'),
  async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded', status: 'error' });
      return;
    }

    let userId = -1;
    let currentUser = null;
    const token = getTokenFromRequest(req);
    if (token) {
      const { user } = await validateSessionToken(token);
      if (!user || !user.id) {
        res.status(401).json({ message: 'Unauthorized', status: 'error' });
        return;
      }
      currentUser = user;
      userId = user.id;
    } else {
      res.status(401).json({ message: 'Unauthorized', status: 'error' });
      return;
    }

    const metadata = JSON.parse(decodeURIComponent(req.file.originalname));
    const { totalChunks, uploadId, originalName, originalSize } = metadata;

    if (!originalSize) {
      res.status(400).json({ message: 'metadata.originalSize is required', status: 'error' });
      return;
    }

    const hasSpace = await UserStorageService.hasEnoughStorageSpace(
      currentUser.id,
      currentUser.storageLimit,
      originalSize
    );
    if (!hasSpace) {
      const maximumStorageSpace = await UserStorageService.getMaxUserStorageSpace(
        currentUser.id,
        currentUser.storageLimit
      );
      const storageInMb = formatFileSize(maximumStorageSpace);
      res.status(400).json({
        message: `You have ${storageInMb} of storage space left and you want to upload ${formatFileSize(originalSize)}.`,
        code: 'STORAGE_LIMIT_EXCEEDED',
        status: 'error',
      });
      return;
    }

    const userDir = path.join(UPLOAD_DIR, userId.toString());
    const dir = path.join(userDir, uploadId);

    if (!fs.existsSync(userDir)) {
      res.status(400).json({ message: 'User directory does not exist.', status: 'error' });
      return;
    }
    if (!fs.existsSync(dir)) {
      res.status(400).json({ message: 'Upload directory does not exist.', status: 'error' });
      return;
    }

    const uploadedChunks = fs.readdirSync(dir).length;

    if (uploadedChunks === parseInt(totalChunks)) {
      let finalPath = path.join(userDir, originalName);
      finalPath = getUniqueFilename(finalPath);

      try {
        const output = fs.createWriteStream(finalPath);
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(dir, `chunk_${i}`);
          output.write(fs.readFileSync(chunkPath));
        }

        let mimeType = req.file?.mimetype || null;

        output.on('finish', async () => {
          finalPath = await convertImageToWebp(finalPath, mimeType);
          const fileStats = fs.statSync(finalPath);
          mimeType = mime.lookup(finalPath) || null;
          const s3Path = await storageProvider.saveFile(
            finalPath,
            path.join(userId.toString(), path.basename(finalPath))
          );
          try {
            const downloadToken = generateRandomToken();
            const result = await db
              .insert(filesTable)
              .values({
                userId: userId,
                originalName: path.basename(finalPath),
                filePath: finalPath,
                s3Path: s3Path,
                mimeType: mimeType || null,
                size: fileStats.size,
                downloadToken: downloadToken,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
              })
              .returning({
                id: filesTable.id,
                downloadToken: filesTable.downloadToken,
              });

            // Clear  chunks
            setTimeout(() => {
              fs.rmSync(dir, { recursive: true });
            }, 1000);

            res.status(200).json({
              message: 'File uploaded successfully',
              status: 'completed',
              fileId: result[0].id,
              downloadToken: result[0].downloadToken,
              originalName: path.basename(finalPath),
              viewUrl: `${BACKEND_URL}${API_PREFIX}/view/${result[0].downloadToken}`,
            });
          } catch (error) {
            console.error('Error saving file info to database:', error);
            res.status(500).json({ message: 'Error saving file information', status: 'error' });
          }
        });
        output.end();
      } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ message: 'Error processing file', status: 'error' });
        return;
      }
    } else {
      res
        .status(200)
        .json({
          message: 'Chunk uploaded',
          status: 'partial',
          uploadId,
          uploadedChunks,
          totalChunks,
        });
    }
  }
);

router.get('/files', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    let userId = -1;
    const token = getTokenFromRequest(req);
    if (token) {
      const { user } = await validateSessionToken(token);
      if (!user || !user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      userId = user.id;
    } else {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const query = db
      .select({
        id: filesTable.id,
        originalName: filesTable.originalName,
        mimeType: filesTable.mimeType,
        size: filesTable.size,
        createdAt: filesTable.createdAt,
        expiresAt: filesTable.expiresAt,
        downloadToken: filesTable.downloadToken,
      })
      .from(filesTable)
      .where(eq(filesTable.userId, userId))
      .orderBy(desc(filesTable.createdAt));

    if (limit) {
      query.limit(limit);
    }

    const result = await query;

    const filesWithUrls = result.map((file) => ({
      ...file,
      downloadUrl: `${BACKEND_URL}${API_PREFIX}/download/${file.downloadToken}`,
      viewUrl: `${BACKEND_URL}${API_PREFIX}/view/${file.downloadToken}`,
    }));

    res.json(filesWithUrls);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

router.delete('/files/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    let userId = -1;
    const token = getTokenFromRequest(req);
    if (token) {
      const { user } = await validateSessionToken(token);
      if (!user || !user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      userId = user.id;
    } else {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const file = await db
      .select()
      .from(filesTable)
      .where(and(eq(filesTable.id, parseInt(req.params.id)), eq(filesTable.userId, userId)))
      .limit(1);

    if (file.length === 0) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    // Supprimer le fichier physique
    if (fs.existsSync(file[0].filePath)) {
      fs.unlinkSync(file[0].filePath);
    }

    if (file[0].s3Path) {
      await storageProvider.deleteFile(file[0].s3Path);
    }

    // Supprimer l'entrée dans la base de données
    await db.delete(filesTable).where(eq(filesTable.id, parseInt(req.params.id)));

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

router.post(
  '/files/:id/toggle-expiration',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      let userId = -1;
      const token = getTokenFromRequest(req);
      if (token) {
        const { user } = await validateSessionToken(token);
        if (!user || !user.id) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }
        userId = user.id;
      } else {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const file = await db
        .select()
        .from(filesTable)
        .where(and(eq(filesTable.id, parseInt(req.params.id)), eq(filesTable.userId, userId)))
        .limit(1);

      if (file.length === 0) {
        res.status(404).json({ message: 'File not found' });
        return;
      }

      if (file[0].expiresAt) {
        await db
          .update(filesTable)
          .set({ expiresAt: null })
          .where(eq(filesTable.id, parseInt(req.params.id)));
      } else {
        await db
          .update(filesTable)
          .set({ expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) }) // 30 days
          .where(eq(filesTable.id, parseInt(req.params.id)));
      }

      res.json({ message: 'File expiration toggled successfully' });
    } catch (error) {
      console.error('Error toggling file expiration:', error);
      res.status(500).json({ message: 'Error toggling file expiration' });
    }
  }
);

export default router;
