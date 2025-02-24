import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import session from 'express-session';
import http from 'http';
import { CLIENT_URL, TAURI_URL, TAURI_URL_DEV, API_PREFIX } from './config/constants';
import { requireAuth } from './middleware/auth';
import authRoutes from './routes/auth';
import cronRoutes from './routes/cron';
import filesRoutes from './routes/files';
import userRoutes from './routes/user';

const app = express();
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const ALLOWED_ORIGINS = [CLIENT_URL, TAURI_URL, TAURI_URL_DEV];

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_very_secure_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Yeeet api is running',
    uptime: process.uptime(),
  });
});

app.get('/ping', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Pong 🏓',
    uptime: process.uptime(),
  });
});

// Routes
app.use(`${API_PREFIX}`, authRoutes);
app.use(`${API_PREFIX}`, cronRoutes);
app.use(`${API_PREFIX}`, userRoutes);
app.use(`${API_PREFIX}`, filesRoutes);
app.use(requireAuth, express.static('public'));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
