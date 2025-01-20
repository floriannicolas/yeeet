import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import session from 'express-session';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import cors from 'cors';
import { eq, and, or, desc, gte, lt, gt, isNull } from 'drizzle-orm';
import { db } from './database';
import { usersTable, filesTable, cronJobsTable, passwordResetTokensTable, User } from './db/schema';
import {
  createSession,
  generateSessionToken,
  invalidateSession,
  validateSessionToken
} from './session';
import cron from 'node-cron';
import { cleanupExpiredFiles, CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES } from './tasks/cleanup';
import { convertImageToWebp, createStorageProvider, getUniqueFilename } from './storage/index';
import {
  getMaxUserStorageSpace,
  hasEnoughStorageSpace,
  getUserStorageUsed,
} from './utils/storage';
import { formatFileSize } from './utils/format';
import mime from 'mime-types';
import { sendPasswordResetEmail } from './utils/email';

// Cleanup expired files every day at 3am
cron.schedule('0 3 * * *', async () => {
  console.log('Running cleanup task...');
  await cleanupExpiredFiles();
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const TAURI_URL = process.env.TAURI_URL || 'tauri://localhost';
const TAURI_URL_DEV = process.env.TAURI_URL_DEV || 'http://localhost:1420';
const API_PREFIX = '/api';
const app = express();
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let server;
let io;

// Configurer CORS avec les nouvelles origines
const ALLOWED_ORIGINS = [
  CLIENT_URL,
  TAURI_URL,
  TAURI_URL_DEV,
];

// En développement local
server = http.createServer(app);
io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.VERCEL
  ? '/tmp'
  : path.join(__dirname, '..', 'uploads');
const storageProvider = createStorageProvider();

app.use(session({
  secret: process.env.SESSION_SECRET || 'votre_secret_key_très_sécurisée',
  resave: false,
  saveUninitialized: false
}));

/**
 * Get the token from the request.
 * @param req 
 * @returns 
 */
const getTokenFromRequest = (req: Request) => {
  const token = req.cookies?.session;
  if (token) {
    return token;
  }

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer') {
      return token;
    }
  }

  return null;
};

app.use(cookieParser());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromRequest(req);
  if (token) {
    const { user } = await validateSessionToken(token);
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
  } else {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
};

app.post(`${API_PREFIX}/register`, async (req: Request, res: Response) => {
  const { username, email, password, invitationKey } = req.body;
  if (invitationKey !== 'YEEEEEEEEEEEEET') {
    res.status(401).json({
      errors: {
        invitationKey: ['Invalid invitation key. You need an invitation key to create an account'],
      },
    });
    return;
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(usersTable).values({
      username,
      email,
      password: hashedPassword
    });
    res.status(200).send({ message: 'Register successful' });
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).json({
        errors: {
          username: ['Username already exists'],
        },
      });
    } else {
      console.error(error);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
});

app.post(`${API_PREFIX}/login`, async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await db.select().from(usersTable)
      .where(or(eq(usersTable.username, username), eq(usersTable.email, username)))
      .limit(1);
    if (user.length > 0) {
      const isPasswordValid = await bcrypt.compare(password, user[0].password);
      if (isPasswordValid) {
        const token = generateSessionToken();
        await createSession(token, user[0].id);
        // setSessionTokenCookie(res as Response, token, session.expiresAt);
        res.status(200).send({
          id: user[0].id,
          username: user[0].username,
          email: user[0].email,
          token: token,
        });
      } else {
        res.status(401).send('Invalid password');
      }
    } else {
      res.status(404).send('User not found');
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post(`${API_PREFIX}/forgot-password`, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (user.length === 0) {
      // Pour des raisons de sécurité, on renvoie toujours un succès
      res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
      return;
    }

    const resetToken = generateRandomToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure

    await db.insert(passwordResetTokensTable).values({
      userId: user[0].id,
      token: resetToken,
      expiresAt
    });

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'An internal error occurred, please try later.' });
  }
});

app.post(`${API_PREFIX}/reset-password`, async (req: Request, res: Response) => {
  try {
      const { token, password } = req.body;

      const resetToken = await db.select()
          .from(passwordResetTokensTable)
          .where(
              and(
                  eq(passwordResetTokensTable.token, token),
                  isNull(passwordResetTokensTable.usedAt),
                  gt(passwordResetTokensTable.expiresAt, new Date())
              )
          )
          .limit(1);

      if (resetToken.length === 0) {
          res.status(400).json({ message: 'Invalid or expired reset token. Please ask a new mail using the "forgot password?" feature.' });
          return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.transaction(async (tx) => {
          await tx.update(usersTable)
              .set({ password: hashedPassword })
              .where(eq(usersTable.id, resetToken[0].userId));

          await tx.update(passwordResetTokensTable)
              .set({ usedAt: new Date() })
              .where(eq(passwordResetTokensTable.id, resetToken[0].id));
      });

      res.json({ message: 'Password reset successful.' });
  } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'An internal error occurred, please try later.' });
  }
});

app.get(`/`, async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Yeeet api is running',
    uptime: process.uptime()
  });
});

app.get(`/health-check`, async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    uptime: process.uptime()
  });
});

app.get(`${API_PREFIX}/check-auth`, async (req: Request, res: Response) => {
  const token = getTokenFromRequest(req);
  let isAuthenticated = false;
  let userId = null;
  let lastAppVersion = null;
  if (token) {
    const { user } = await validateSessionToken(token);
    isAuthenticated = !!user;
    userId = user?.id;
    lastAppVersion = user?.lastAppVersion;
  }
  res.json({ 
    isAuthenticated, 
    userId,
    lastAppVersion,
  });
});

app.post(`${API_PREFIX}/logout`, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: 'Error logging out' });
    } else {
      const token = getTokenFromRequest(req);
      invalidateSession(token);
      // deleteSessionTokenCookie(res as Response);
      res.json({ message: 'Logged out successfully' });
    }
  });
});


// Step 2: Multer setup for handling file chunks
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
  }
});
const upload = multer({ storage });

const generateRandomToken = () => {
  return crypto.randomBytes(8).toString('hex');
};

app.get(`${API_PREFIX}/download/:token`, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select()
      .from(filesTable)
      .where(
        and(
          eq(filesTable.downloadToken, req.params.token)
        )
      )
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const file = result[0];

    res.setHeader('Content-Type', file.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    const fileContent = await storageProvider.getFile(file.s3Path || file.filePath, file.filePath);
    if (fileContent.pipe) {
      fileContent.pipe(res);
    } else {
      res.send(fileContent);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

app.get(`${API_PREFIX}/view/:token`, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select()
      .from(filesTable)
      .where(
        and(
          eq(filesTable.downloadToken, req.params.token)
        )
      )
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
      'audio/webm'
    ];

    if (!viewableMimeTypes.includes(file.mimeType ?? '')) {
      res.redirect(`${BACKEND_URL}${API_PREFIX}/download/${file.downloadToken}`);
      return;
    }

    res.setHeader('Content-Type', file.mimeType ?? '');
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    const fileContent = await storageProvider.getFile(file.s3Path || file.filePath, file.filePath);
    if (fileContent.pipe) {
      fileContent.pipe(res);
    } else {
      res.send(fileContent);
    }

  } catch (error) {
    console.error('Error viewing file:', error);
    res.status(500).json({ message: 'Error viewing file' });
  }
});

app.use(requireAuth, express.static('public'));

app.post(`${API_PREFIX}/update-app-version`, requireAuth, async (req: Request, res: Response) => {
  const { appVersion } = req.body;
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

  await db.update(usersTable).set({ lastAppVersion: appVersion }).where(eq(usersTable.id, userId));
  res.json({ message: 'App version updated' });
});

app.post(`${API_PREFIX}/upload`, requireAuth, upload.single('chunk'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  let userId = -1;
  let currentUser = null;
  const token = getTokenFromRequest(req);
  if (token) {
    const { user } = await validateSessionToken(token);
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    currentUser = user;
    userId = user.id;
  } else {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const metadata = JSON.parse(decodeURIComponent(req.file.originalname));
  const { index, totalChunks, uploadId, originalName, originalSize } = metadata;

  if (!originalSize) {
    res.status(400).json({ message: 'metadata.originalSize is required' });
    return;
  }

  const hasSpace = await hasEnoughStorageSpace(currentUser.id, currentUser.storageLimit, originalSize);
  if (!hasSpace) {
    const maximumStorageSpace = await getMaxUserStorageSpace(currentUser.id, currentUser.storageLimit);
    const storageInMb = formatFileSize(maximumStorageSpace);
    res.status(400).json({
      message: `You have ${storageInMb} of storage space left and you want to upload ${formatFileSize(originalSize)}.`,
      code: 'STORAGE_LIMIT_EXCEEDED'
    });
    return;
  }

  const userDir = path.join(UPLOAD_DIR, userId.toString());
  const dir = path.join(userDir, uploadId);

  if (!fs.existsSync(userDir)) {
    res.status(400).json({ message: 'User directory does not exist.' });
    return;
  }
  if (!fs.existsSync(dir)) {
    res.status(400).json({ message: 'Upload directory does not exist.' });
    return;
  }

  const uploadedChunks = fs.readdirSync(dir).length;
  io.emit(`progress.${userId}`, { uploadId, uploadedChunks, totalChunks });

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
          const result = await db.insert(filesTable).values({
            userId: userId,
            originalName: path.basename(finalPath),
            filePath: finalPath,
            s3Path: s3Path,
            mimeType: mimeType || null,
            size: fileStats.size,
            downloadToken: downloadToken,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
          }).returning({
            id: filesTable.id,
            downloadToken: filesTable.downloadToken
          });

          // Clear  chunks
          setTimeout(() => {
            fs.rmSync(dir, { recursive: true });
          }, 1000);

          io.emit(`completed.${userId}`, {
            uploadId,
            originalName: path.basename(finalPath),
            viewUrl: `${BACKEND_URL}${API_PREFIX}/view/${result[0].downloadToken}`
          });

          res.status(200).json({
            message: 'File uploaded successfully',
            fileId: result[0].id,
            downloadToken: result[0].downloadToken
          });
        } catch (error) {
          console.error('Error saving file info to database:', error);
          res.status(500).json({ message: 'Error saving file information' });
        }
      });
      output.end();

    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ message: 'Error processing file' });
      return;
    }
  } else {
    res.status(200).json({ message: 'Chunk uploaded' });
  }
});
app.use('/socket.io', express.static('node_modules/socket.io/client-dist'));

app.get(`${API_PREFIX}/storage-info`, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = await validateSessionToken(getTokenFromRequest(req)!);
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const usedStorage = await getUserStorageUsed(user.id);
    res.json({
      used: usedStorage,
      limit: user.storageLimit,
      available: user.storageLimit - usedStorage,
      usedPercentage: Math.round((usedStorage / user.storageLimit) * 100)
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({ message: 'Error getting storage info' });
  }
});

app.get(`${API_PREFIX}/cron-jobs`, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = await validateSessionToken(getTokenFromRequest(req)!);
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const jobsLaunched = [];
    const jobsAlreadyLaunched = [];

    const cronJobCleanupExpiredFiles = await db.select()
      .from(cronJobsTable)
      .where(
        and(
          eq(cronJobsTable.type, CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES),
          gte(cronJobsTable.createdAt, today),
          lt(cronJobsTable.createdAt, tomorrow)
        )
      )
      .limit(1);

    if (cronJobCleanupExpiredFiles.length === 0) {
      await db.insert(cronJobsTable).values({
        type: CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES
      });
      cleanupExpiredFiles();
      jobsLaunched.push(CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
    } else {
      jobsAlreadyLaunched.push(CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
    }

    if (jobsLaunched.length > 0) {
      await db.delete(cronJobsTable)
        .where(lt(cronJobsTable.createdAt, today));
    }

    res.json({
      status: 'success',
      jobsLaunched,
      jobsAlreadyLaunched
    });
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({ message: 'Error getting storage info' });
  }
});


app.get(`${API_PREFIX}/files`, requireAuth, async (req: Request, res: Response): Promise<void> => {
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
    let query = db.select({
      id: filesTable.id,
      originalName: filesTable.originalName,
      mimeType: filesTable.mimeType,
      size: filesTable.size,
      createdAt: filesTable.createdAt,
      expiresAt: filesTable.expiresAt,
      downloadToken: filesTable.downloadToken
    })
      .from(filesTable)
      .where(eq(filesTable.userId, userId))
      .orderBy(desc(filesTable.createdAt));

    if (limit) {
      query.limit(limit);
    }

    const result = await query;

    const filesWithUrls = result.map(file => ({
      ...file,
      downloadUrl: `${BACKEND_URL}${API_PREFIX}/download/${file.downloadToken}`,
      viewUrl: `${BACKEND_URL}${API_PREFIX}/view/${file.downloadToken}`
    }));

    res.json(filesWithUrls);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

app.delete(`${API_PREFIX}/files/:id`, requireAuth, async (req: Request, res: Response): Promise<void> => {
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

    const file = await db.select()
      .from(filesTable)
      .where(
        and(
          eq(filesTable.id, parseInt(req.params.id)),
          eq(filesTable.userId, userId)
        )
      )
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
    await db.delete(filesTable)
      .where(eq(filesTable.id, parseInt(req.params.id)));

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

app.post(`${API_PREFIX}/files/:id/toggle-expiration`, requireAuth, async (req: Request, res: Response): Promise<void> => {
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

    const file = await db.select()
      .from(filesTable)
      .where(
        and(
          eq(filesTable.id, parseInt(req.params.id)),
          eq(filesTable.userId, userId)
        )
      )
      .limit(1);

    if (file.length === 0) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    if (file[0].expiresAt) {
      await db.update(filesTable)
        .set({ expiresAt: null })
        .where(eq(filesTable.id, parseInt(req.params.id)));
    } else {
      await db.update(filesTable)
        .set({ expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) }) // 30 days
        .where(eq(filesTable.id, parseInt(req.params.id)));
    }

    res.json({ message: 'File expiration toggled successfully' });
  } catch (error) {
    console.error('Error toggling file expiration:', error);
    res.status(500).json({ message: 'Error toggling file expiration' });
  }
});


server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
