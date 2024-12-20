import 'dotenv/config';
import express from 'express';
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
import { eq, and, or } from 'drizzle-orm';
import { db } from './database';
import { usersTable, filesTable } from './db/schema';
import type { Request, Response, NextFunction } from 'express';
import { createSession, deleteSessionTokenCookie, generateSessionToken, invalidateSession, setSessionTokenCookie, validateSessionToken } from './session';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const API_PREFIX = '/api';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(session({
  secret: process.env.SESSION_SECRET || 'votre_secret_key_très_sécurisée',
  resave: false,
  saveUninitialized: false
}));

app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.session;
  if (token) {
    const { user } = await validateSessionToken(token);
    req.session.userId = user?.id ?? undefined;
  }
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

app.post(`${API_PREFIX}/register`, async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(usersTable).values({
      username,
      email,
      password: hashedPassword
    });
    res.redirect('/login');
  } catch (error: any) {
    if (error.code === '23505') {
      res.status(400).send('Username already exists');
    } else {
      console.error(error);
      res.status(500).send('Server error');
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
        req.session.userId = user[0].id;
        const token = generateSessionToken();
        const session = await createSession(token, user[0].id);
        setSessionTokenCookie(res as Response, token, session.expiresAt);
        res.redirect('/');
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

app.get(`${API_PREFIX}/check-auth`, async(req: Request, res: Response) => {
  const token = req.cookies?.session;
  let isAuthenticated = false;
  if (token) {
    const { user } = await validateSessionToken(token);
    isAuthenticated = !!user;
  }
  res.json({ isAuthenticated });
});

app.get(`${API_PREFIX}/logout`, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ message: 'Error logging out' });
    } else {
      const token = req.cookies?.session;
      invalidateSession(token);
      deleteSessionTokenCookie(res as Response);
      res.json({ message: 'Logged out successfully' });
    }
  });
});


// Step 2: Multer setup for handling file chunks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.session.userId) {
      return cb(new Error('User not authenticated'), '');
    }
    const metadata = JSON.parse(decodeURIComponent(file.originalname));
    const userDir = path.join(UPLOAD_DIR, req.session.userId.toString());
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

const generateDownloadToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

app.post(`${API_PREFIX}/upload`, requireAuth, upload.single('chunk'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }

  const metadata = JSON.parse(decodeURIComponent(req.file.originalname));
  const { index, totalChunks, uploadId, originalName } = metadata;
  const userDir = path.join(UPLOAD_DIR, req.session.userId!.toString());
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
  io.emit('progress', { uploadId, uploadedChunks, totalChunks });

  if (uploadedChunks === parseInt(totalChunks)) {
    const getUniqueFilename = (originalPath: string) => {
      const dir = path.dirname(originalPath);
      const ext = path.extname(originalPath);
      const baseName = path.basename(originalPath, ext);
      let counter = 1;
      let finalPath = originalPath;

      while (fs.existsSync(finalPath)) {
        finalPath = path.join(dir, `${baseName} (${counter})${ext}`);
        counter++;
      }
      return finalPath;
    };

    let finalPath = path.join(userDir, originalName);
    finalPath = getUniqueFilename(finalPath);

    try {
      const output = fs.createWriteStream(finalPath);
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(dir, `chunk_${i}`);
        output.write(fs.readFileSync(chunkPath));
      }

      output.on('finish', async () => {
        const fileStats = fs.statSync(finalPath);
        try {
          const downloadToken = generateDownloadToken();
          const result = await db.insert(filesTable).values({
            userId: req.session.userId,
            originalName: path.basename(finalPath),
            filePath: finalPath,
            mimeType: req.file?.mimetype,
            size: fileStats.size,
            downloadToken: downloadToken
          }).returning({
            id: filesTable.id,
            downloadToken: filesTable.downloadToken
          });

          // Clear  chunks
          setTimeout(() => {
            fs.rmSync(dir, { recursive: true });
          }, 1000);

          io.emit('completed', {
            uploadId,
            originalName: path.basename(finalPath)
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
app.use(requireAuth, express.static('public'));


app.get(`${API_PREFIX}/download/:token`, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select()
      .from(filesTable)
      .where(
        and(
          eq(filesTable.downloadToken, req.params.token),
          eq(filesTable.userId, req.session.userId ?? 0)
        )
      )
      .limit(1);

    if (result.length === 0) {
      res.status(404).json({ message: 'File not found' });
      return;
    }

    const file = result[0];
    res.download(file.filePath, file.originalName);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

app.get(`${API_PREFIX}/files`, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.select({
      id: filesTable.id,
      originalName: filesTable.originalName,
      mimeType: filesTable.mimeType,
      size: filesTable.size,
      createdAt: filesTable.createdAt,
      downloadUrl: filesTable.downloadToken
    })
      .from(filesTable)
      .where(eq(filesTable.userId, req.session.userId ?? 0));

    const filesWithUrls = result.map(file => ({
      ...file,
      downloadUrl: `/api/download/${file.downloadUrl}`
    }));

    res.json(filesWithUrls);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ message: 'Error fetching files' });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 