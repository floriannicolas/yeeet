"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const express_session_1 = __importDefault(require("express-session"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const cors_1 = __importDefault(require("cors"));
const drizzle_orm_1 = require("drizzle-orm");
const database_1 = require("./database");
const schema_1 = require("./db/schema");
const session_1 = require("./session");
const node_cron_1 = __importDefault(require("node-cron"));
const cleanup_1 = require("./tasks/cleanup");
const index_1 = require("./storage/index");
const storage_1 = require("./utils/storage");
const format_1 = require("./utils/format");
const mime_types_1 = __importDefault(require("mime-types"));
const email_1 = require("./utils/email");
// Cleanup expired files every day at 3am
node_cron_1.default.schedule('0 3 * * *', async () => {
    console.log('Running cleanup task...');
    await (0, cleanup_1.cleanupExpiredFiles)();
});
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const TAURI_URL = process.env.TAURI_URL || 'tauri://localhost';
const TAURI_URL_DEV = process.env.TAURI_URL_DEV || 'http://localhost:1420';
const API_PREFIX = '/api';
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
let server;
// Configurer CORS avec les nouvelles origines
const ALLOWED_ORIGINS = [
    CLIENT_URL,
    TAURI_URL,
    TAURI_URL_DEV,
];
// En développement local
server = http_1.default.createServer(app);
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.VERCEL
    ? '/tmp'
    : path_1.default.join(__dirname, '..', 'uploads');
const storageProvider = (0, index_1.createStorageProvider)();
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'votre_secret_key_très_sécurisée',
    resave: false,
    saveUninitialized: false
}));
/**
 * Get the token from the request.
 * @param req
 * @returns
 */
const getTokenFromRequest = (req) => {
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
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*")) {
            callback(null, true);
        }
        else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const requireAuth = async (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (token) {
        const { user } = await (0, session_1.validateSessionToken)(token);
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
    }
    else {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    next();
};
app.post(`${API_PREFIX}/register`, async (req, res) => {
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
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await database_1.db.insert(schema_1.usersTable).values({
            username,
            email,
            password: hashedPassword
        });
        res.status(200).send({ message: 'Register successful' });
    }
    catch (error) {
        if (error.code === '23505') {
            res.status(400).json({
                errors: {
                    username: ['Username already exists'],
                },
            });
        }
        else {
            console.error(error);
            res.status(500).json({
                message: 'Server error'
            });
        }
    }
});
app.post(`${API_PREFIX}/login`, async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await database_1.db.select().from(schema_1.usersTable)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.usersTable.username, username), (0, drizzle_orm_1.eq)(schema_1.usersTable.email, username)))
            .limit(1);
        if (user.length > 0) {
            const isPasswordValid = await bcrypt_1.default.compare(password, user[0].password);
            if (isPasswordValid) {
                const token = (0, session_1.generateSessionToken)();
                await (0, session_1.createSession)(token, user[0].id);
                // setSessionTokenCookie(res as Response, token, session.expiresAt);
                res.status(200).send({
                    id: user[0].id,
                    username: user[0].username,
                    email: user[0].email,
                    token: token,
                });
            }
            else {
                res.status(401).send('Invalid password');
            }
        }
        else {
            res.status(404).send('User not found');
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});
app.post(`${API_PREFIX}/forgot-password`, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await database_1.db.select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email))
            .limit(1);
        if (user.length === 0) {
            // Pour des raisons de sécurité, on renvoie toujours un succès
            res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
            return;
        }
        const resetToken = generateRandomToken();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure
        await database_1.db.insert(schema_1.passwordResetTokensTable).values({
            userId: user[0].id,
            token: resetToken,
            expiresAt
        });
        await (0, email_1.sendPasswordResetEmail)(email, resetToken);
        res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
    }
    catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'An internal error occurred, please try later.' });
    }
});
app.post(`${API_PREFIX}/reset-password`, async (req, res) => {
    try {
        const { token, password } = req.body;
        const resetToken = await database_1.db.select()
            .from(schema_1.passwordResetTokensTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.passwordResetTokensTable.token, token), (0, drizzle_orm_1.isNull)(schema_1.passwordResetTokensTable.usedAt), (0, drizzle_orm_1.gt)(schema_1.passwordResetTokensTable.expiresAt, new Date())))
            .limit(1);
        if (resetToken.length === 0) {
            res.status(400).json({ message: 'Invalid or expired reset token. Please ask a new mail using the "forgot password?" feature.' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await database_1.db.transaction(async (tx) => {
            await tx.update(schema_1.usersTable)
                .set({ password: hashedPassword })
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, resetToken[0].userId));
            await tx.update(schema_1.passwordResetTokensTable)
                .set({ usedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.passwordResetTokensTable.id, resetToken[0].id));
        });
        res.json({ message: 'Password reset successful.' });
    }
    catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'An internal error occurred, please try later.' });
    }
});
app.get(`/`, async (req, res) => {
    res.json({
        status: 'ok',
        message: 'Yeeet api is running',
        uptime: process.uptime()
    });
});
app.get(`/health-check`, async (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running',
        uptime: process.uptime()
    });
});
app.get(`${API_PREFIX}/check-auth`, async (req, res) => {
    const token = getTokenFromRequest(req);
    let isAuthenticated = false;
    let userId = null;
    let lastAppVersion = null;
    if (token) {
        const { user } = await (0, session_1.validateSessionToken)(token);
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
app.post(`${API_PREFIX}/logout`, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ message: 'Error logging out' });
        }
        else {
            const token = getTokenFromRequest(req);
            (0, session_1.invalidateSession)(token);
            // deleteSessionTokenCookie(res as Response);
            res.json({ message: 'Logged out successfully' });
        }
    });
});
// Step 2: Multer setup for handling file chunks
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        let userId = -1;
        const token = getTokenFromRequest(req);
        if (token) {
            const { user } = await (0, session_1.validateSessionToken)(token);
            if (!user || !user.id) {
                return cb(new Error('User not authenticated'), '');
            }
            userId = user.id;
        }
        else {
            return cb(new Error('User not authenticated'), '');
        }
        const metadata = JSON.parse(decodeURIComponent(file.originalname));
        const userDir = path_1.default.join(UPLOAD_DIR, userId.toString());
        const dir = path_1.default.join(userDir, metadata.uploadId);
        if (!fs_1.default.existsSync(userDir))
            fs_1.default.mkdirSync(userDir, { recursive: true });
        if (!fs_1.default.existsSync(dir))
            fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const metadata = JSON.parse(decodeURIComponent(file.originalname));
        cb(null, `chunk_${metadata.index}`);
    }
});
const upload = (0, multer_1.default)({ storage });
const generateRandomToken = () => {
    return crypto_1.default.randomBytes(8).toString('hex');
};
app.get(`${API_PREFIX}/download/:token`, async (req, res) => {
    try {
        const result = await database_1.db.select()
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.filesTable.downloadToken, req.params.token)))
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
        }
        else {
            res.send(fileContent);
        }
    }
    catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});
app.get(`${API_PREFIX}/view/:token`, async (req, res) => {
    try {
        const result = await database_1.db.select()
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.filesTable.downloadToken, req.params.token)))
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
        }
        else {
            res.send(fileContent);
        }
    }
    catch (error) {
        console.error('Error viewing file:', error);
        res.status(500).json({ message: 'Error viewing file' });
    }
});
app.use(requireAuth, express_1.default.static('public'));
app.post(`${API_PREFIX}/update-app-version`, requireAuth, async (req, res) => {
    const { appVersion } = req.body;
    let userId = -1;
    const token = getTokenFromRequest(req);
    if (token) {
        const { user } = await (0, session_1.validateSessionToken)(token);
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        userId = user.id;
    }
    else {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    await database_1.db.update(schema_1.usersTable).set({ lastAppVersion: appVersion }).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId));
    res.json({ message: 'App version updated' });
});
app.post(`${API_PREFIX}/upload`, requireAuth, upload.single('chunk'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded', status: 'error' });
        return;
    }
    let userId = -1;
    let currentUser = null;
    const token = getTokenFromRequest(req);
    if (token) {
        const { user } = await (0, session_1.validateSessionToken)(token);
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized', status: 'error' });
            return;
        }
        currentUser = user;
        userId = user.id;
    }
    else {
        res.status(401).json({ message: 'Unauthorized', status: 'error' });
        return;
    }
    const metadata = JSON.parse(decodeURIComponent(req.file.originalname));
    const { index, totalChunks, uploadId, originalName, originalSize } = metadata;
    if (!originalSize) {
        res.status(400).json({ message: 'metadata.originalSize is required', status: 'error' });
        return;
    }
    const hasSpace = await (0, storage_1.hasEnoughStorageSpace)(currentUser.id, currentUser.storageLimit, originalSize);
    if (!hasSpace) {
        const maximumStorageSpace = await (0, storage_1.getMaxUserStorageSpace)(currentUser.id, currentUser.storageLimit);
        const storageInMb = (0, format_1.formatFileSize)(maximumStorageSpace);
        res.status(400).json({
            message: `You have ${storageInMb} of storage space left and you want to upload ${(0, format_1.formatFileSize)(originalSize)}.`,
            code: 'STORAGE_LIMIT_EXCEEDED',
            status: 'error',
        });
        return;
    }
    const userDir = path_1.default.join(UPLOAD_DIR, userId.toString());
    const dir = path_1.default.join(userDir, uploadId);
    if (!fs_1.default.existsSync(userDir)) {
        res.status(400).json({ message: 'User directory does not exist.', status: 'error' });
        return;
    }
    if (!fs_1.default.existsSync(dir)) {
        res.status(400).json({ message: 'Upload directory does not exist.', status: 'error' });
        return;
    }
    const uploadedChunks = fs_1.default.readdirSync(dir).length;
    if (uploadedChunks === parseInt(totalChunks)) {
        let finalPath = path_1.default.join(userDir, originalName);
        finalPath = (0, index_1.getUniqueFilename)(finalPath);
        try {
            const output = fs_1.default.createWriteStream(finalPath);
            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path_1.default.join(dir, `chunk_${i}`);
                output.write(fs_1.default.readFileSync(chunkPath));
            }
            let mimeType = req.file?.mimetype || null;
            output.on('finish', async () => {
                finalPath = await (0, index_1.convertImageToWebp)(finalPath, mimeType);
                const fileStats = fs_1.default.statSync(finalPath);
                mimeType = mime_types_1.default.lookup(finalPath) || null;
                const s3Path = await storageProvider.saveFile(finalPath, path_1.default.join(userId.toString(), path_1.default.basename(finalPath)));
                try {
                    const downloadToken = generateRandomToken();
                    const result = await database_1.db.insert(schema_1.filesTable).values({
                        userId: userId,
                        originalName: path_1.default.basename(finalPath),
                        filePath: finalPath,
                        s3Path: s3Path,
                        mimeType: mimeType || null,
                        size: fileStats.size,
                        downloadToken: downloadToken,
                        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
                    }).returning({
                        id: schema_1.filesTable.id,
                        downloadToken: schema_1.filesTable.downloadToken
                    });
                    // Clear  chunks
                    setTimeout(() => {
                        fs_1.default.rmSync(dir, { recursive: true });
                    }, 1000);
                    res.status(200).json({
                        message: 'File uploaded successfully',
                        status: 'completed',
                        fileId: result[0].id,
                        downloadToken: result[0].downloadToken,
                        originalName: path_1.default.basename(finalPath),
                        viewUrl: `${BACKEND_URL}${API_PREFIX}/view/${result[0].downloadToken}`,
                    });
                }
                catch (error) {
                    console.error('Error saving file info to database:', error);
                    res.status(500).json({ message: 'Error saving file information', status: 'error' });
                }
            });
            output.end();
        }
        catch (error) {
            console.error('Error processing file:', error);
            res.status(500).json({ message: 'Error processing file', status: 'error' });
            return;
        }
    }
    else {
        res.status(200).json({ message: 'Chunk uploaded', status: 'partial', uploadId, uploadedChunks, totalChunks });
    }
});
app.get(`${API_PREFIX}/storage-info`, requireAuth, async (req, res) => {
    try {
        const { user } = await (0, session_1.validateSessionToken)(getTokenFromRequest(req));
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const usedStorage = await (0, storage_1.getUserStorageUsed)(user.id);
        res.json({
            used: usedStorage,
            limit: user.storageLimit,
            available: user.storageLimit - usedStorage,
            usedPercentage: Math.round((usedStorage / user.storageLimit) * 100)
        });
    }
    catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ message: 'Error getting storage info' });
    }
});
app.get(`${API_PREFIX}/cron-jobs`, requireAuth, async (req, res) => {
    try {
        const { user } = await (0, session_1.validateSessionToken)(getTokenFromRequest(req));
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
        const cronJobCleanupExpiredFiles = await database_1.db.select()
            .from(schema_1.cronJobsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cronJobsTable.type, cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES), (0, drizzle_orm_1.gte)(schema_1.cronJobsTable.createdAt, today), (0, drizzle_orm_1.lt)(schema_1.cronJobsTable.createdAt, tomorrow)))
            .limit(1);
        if (cronJobCleanupExpiredFiles.length === 0) {
            await database_1.db.insert(schema_1.cronJobsTable).values({
                type: cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES
            });
            (0, cleanup_1.cleanupExpiredFiles)();
            jobsLaunched.push(cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
        }
        else {
            jobsAlreadyLaunched.push(cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
        }
        if (jobsLaunched.length > 0) {
            await database_1.db.delete(schema_1.cronJobsTable)
                .where((0, drizzle_orm_1.lt)(schema_1.cronJobsTable.createdAt, today));
        }
        res.json({
            status: 'success',
            jobsLaunched,
            jobsAlreadyLaunched
        });
    }
    catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ message: 'Error getting storage info' });
    }
});
app.get(`${API_PREFIX}/files`, requireAuth, async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        let userId = -1;
        const token = getTokenFromRequest(req);
        if (token) {
            const { user } = await (0, session_1.validateSessionToken)(token);
            if (!user || !user.id) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            userId = user.id;
        }
        else {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        let query = database_1.db.select({
            id: schema_1.filesTable.id,
            originalName: schema_1.filesTable.originalName,
            mimeType: schema_1.filesTable.mimeType,
            size: schema_1.filesTable.size,
            createdAt: schema_1.filesTable.createdAt,
            expiresAt: schema_1.filesTable.expiresAt,
            downloadToken: schema_1.filesTable.downloadToken
        })
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.eq)(schema_1.filesTable.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.filesTable.createdAt));
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
    }
    catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Error fetching files' });
    }
});
app.delete(`${API_PREFIX}/files/:id`, requireAuth, async (req, res) => {
    try {
        let userId = -1;
        const token = getTokenFromRequest(req);
        if (token) {
            const { user } = await (0, session_1.validateSessionToken)(token);
            if (!user || !user.id) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            userId = user.id;
        }
        else {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const file = await database_1.db.select()
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.filesTable.id, parseInt(req.params.id)), (0, drizzle_orm_1.eq)(schema_1.filesTable.userId, userId)))
            .limit(1);
        if (file.length === 0) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        // Supprimer le fichier physique
        if (fs_1.default.existsSync(file[0].filePath)) {
            fs_1.default.unlinkSync(file[0].filePath);
        }
        if (file[0].s3Path) {
            await storageProvider.deleteFile(file[0].s3Path);
        }
        // Supprimer l'entrée dans la base de données
        await database_1.db.delete(schema_1.filesTable)
            .where((0, drizzle_orm_1.eq)(schema_1.filesTable.id, parseInt(req.params.id)));
        res.json({ message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Error deleting file' });
    }
});
app.post(`${API_PREFIX}/files/:id/toggle-expiration`, requireAuth, async (req, res) => {
    try {
        let userId = -1;
        const token = getTokenFromRequest(req);
        if (token) {
            const { user } = await (0, session_1.validateSessionToken)(token);
            if (!user || !user.id) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            userId = user.id;
        }
        else {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const file = await database_1.db.select()
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.filesTable.id, parseInt(req.params.id)), (0, drizzle_orm_1.eq)(schema_1.filesTable.userId, userId)))
            .limit(1);
        if (file.length === 0) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        if (file[0].expiresAt) {
            await database_1.db.update(schema_1.filesTable)
                .set({ expiresAt: null })
                .where((0, drizzle_orm_1.eq)(schema_1.filesTable.id, parseInt(req.params.id)));
        }
        else {
            await database_1.db.update(schema_1.filesTable)
                .set({ expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) }) // 30 days
                .where((0, drizzle_orm_1.eq)(schema_1.filesTable.id, parseInt(req.params.id)));
        }
        res.json({ message: 'File expiration toggled successfully' });
    }
    catch (error) {
        console.error('Error toggling file expiration:', error);
        res.status(500).json({ message: 'Error toggling file expiration' });
    }
});
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map