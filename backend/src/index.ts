import dotenv from "dotenv";
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import http from 'http';
import session from 'express-session';
import cors from 'cors';
import { CLIENT_URL, TAURI_URL, TAURI_URL_DEV, API_PREFIX } from "./config/constants";
import { requireAuth } from "./middleware/auth";
import authRoutes from './routes/auth';
import cronRoutes from './routes/cron';
import userRoutes from './routes/user';
import filesRoutes from './routes/files';

const app = express();
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let server;

const ALLOWED_ORIGINS = [
  CLIENT_URL,
  TAURI_URL,
  TAURI_URL_DEV,
];

server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_very_secure_secret_key',
  resave: false,
  saveUninitialized: false
}));

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

app.get('/', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Yeeet api is running',
    uptime: process.uptime()
  });
});

app.get('/test', async (req: Request, res: Response) => {
  res.json({
    status: 'test',
    message: 'Yeeet api is running',
    uptime: process.uptime()
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
