"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const drizzle_orm_1 = require("drizzle-orm");
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const session_1 = require("../session");
const storage_1 = require("../services/storage");
const user_storage_1 = require("../services/user-storage");
const formatters_1 = require("../lib/formatters");
const mime_types_1 = __importDefault(require("mime-types"));
const constants_1 = require("../config/constants");
const tokens_1 = require("../lib/tokens");
const auth_1 = require("../middleware/auth");
const storageProvider = (0, storage_1.createStorageProvider)();
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        let userId = -1;
        const token = (0, session_1.getTokenFromRequest)(req);
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
        const userDir = path_1.default.join(storage_1.UPLOAD_DIR, userId.toString());
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
const router = (0, express_1.Router)();
router.get('/download/:token', async (req, res) => {
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
router.get('/view/:token', async (req, res) => {
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
            res.redirect(`${constants_1.BACKEND_URL}${constants_1.API_PREFIX}/download/${file.downloadToken}`);
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
router.post('/upload', auth_1.requireAuth, upload.single('chunk'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ message: 'No file uploaded', status: 'error' });
        return;
    }
    let userId = -1;
    let currentUser = null;
    const token = (0, session_1.getTokenFromRequest)(req);
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
    const { totalChunks, uploadId, originalName, originalSize } = metadata;
    if (!originalSize) {
        res.status(400).json({ message: 'metadata.originalSize is required', status: 'error' });
        return;
    }
    const hasSpace = await user_storage_1.UserStorageService.hasEnoughStorageSpace(currentUser.id, currentUser.storageLimit, originalSize);
    if (!hasSpace) {
        const maximumStorageSpace = await user_storage_1.UserStorageService.getMaxUserStorageSpace(currentUser.id, currentUser.storageLimit);
        const storageInMb = (0, formatters_1.formatFileSize)(maximumStorageSpace);
        res.status(400).json({
            message: `You have ${storageInMb} of storage space left and you want to upload ${(0, formatters_1.formatFileSize)(originalSize)}.`,
            code: 'STORAGE_LIMIT_EXCEEDED',
            status: 'error',
        });
        return;
    }
    const userDir = path_1.default.join(storage_1.UPLOAD_DIR, userId.toString());
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
        finalPath = (0, storage_1.getUniqueFilename)(finalPath);
        try {
            const output = fs_1.default.createWriteStream(finalPath);
            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path_1.default.join(dir, `chunk_${i}`);
                output.write(fs_1.default.readFileSync(chunkPath));
            }
            let mimeType = req.file?.mimetype || null;
            output.on('finish', async () => {
                finalPath = await (0, storage_1.convertImageToWebp)(finalPath, mimeType);
                const fileStats = fs_1.default.statSync(finalPath);
                mimeType = mime_types_1.default.lookup(finalPath) || null;
                const s3Path = await storageProvider.saveFile(finalPath, path_1.default.join(userId.toString(), path_1.default.basename(finalPath)));
                try {
                    const downloadToken = (0, tokens_1.generateRandomToken)();
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
                        viewUrl: `${constants_1.BACKEND_URL}${constants_1.API_PREFIX}/view/${result[0].downloadToken}`,
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
router.get('/files', auth_1.requireAuth, async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        let userId = -1;
        const token = (0, session_1.getTokenFromRequest)(req);
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
            downloadUrl: `${constants_1.BACKEND_URL}${constants_1.API_PREFIX}/download/${file.downloadToken}`,
            viewUrl: `${constants_1.BACKEND_URL}${constants_1.API_PREFIX}/view/${file.downloadToken}`
        }));
        res.json(filesWithUrls);
    }
    catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Error fetching files' });
    }
});
router.delete('/files/:id', auth_1.requireAuth, async (req, res) => {
    try {
        let userId = -1;
        const token = (0, session_1.getTokenFromRequest)(req);
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
router.post('/files/:id/toggle-expiration', auth_1.requireAuth, async (req, res) => {
    try {
        let userId = -1;
        const token = (0, session_1.getTokenFromRequest)(req);
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
exports.default = router;
//# sourceMappingURL=files.js.map