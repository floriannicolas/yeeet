"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertImageToWebp = exports.convertImageToAvif = exports.getUniqueFilename = exports.convertBytesToMb = exports.UPLOAD_DIR = void 0;
exports.getUserStorageUsed = getUserStorageUsed;
exports.getMaxUserStorageSpace = getMaxUserStorageSpace;
exports.hasEnoughStorageSpace = hasEnoughStorageSpace;
exports.createStorageProvider = createStorageProvider;
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const formatters_1 = require("../lib/formatters");
const heic_convert_1 = __importDefault(require("heic-convert"));
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.UPLOAD_DIR = process.env.VERCEL
    ? '/tmp'
    : path_1.default.join(__dirname, '..', '..', 'uploads');
const convertBytesToMb = (bytes) => {
    return Math.round(bytes / (1024 * 1024));
};
exports.convertBytesToMb = convertBytesToMb;
async function getUserStorageUsed(userId) {
    const result = await database_1.db
        .select({ totalSize: (0, drizzle_orm_1.sum)(schema_1.filesTable.size) })
        .from(schema_1.filesTable)
        .where((0, drizzle_orm_1.eq)(schema_1.filesTable.userId, userId));
    let totalSize = result[0].totalSize;
    if (totalSize) {
        return parseInt(totalSize);
    }
    return 0;
}
async function getMaxUserStorageSpace(userId, limit) {
    const usedStorage = await getUserStorageUsed(userId);
    return limit - usedStorage;
}
async function hasEnoughStorageSpace(userId, limit, fileSize) {
    const usedStorage = await getUserStorageUsed(userId);
    return (usedStorage + fileSize) <= limit;
}
const getUniqueFilename = (originalPath) => {
    const dir = path_1.default.dirname(originalPath);
    const ext = path_1.default.extname(originalPath);
    const baseName = path_1.default.basename(originalPath, ext);
    let counter = 1;
    let finalPath = originalPath;
    while (fs_1.default.existsSync(finalPath)) {
        finalPath = path_1.default.join(dir, `${baseName} (${counter})${ext}`);
        counter++;
    }
    return finalPath;
};
exports.getUniqueFilename = getUniqueFilename;
const convertImageToAvif = async (filePath, mimeType) => {
    if (!mimeType || !mimeType.startsWith('image/')) {
        return filePath;
    }
    console.time('convertImageToAvif');
    console.time('convertImageToAvif.sharp.toBuffer');
    const image = await (0, sharp_1.default)(filePath)
        .resize({ height: 2160, withoutEnlargement: true })
        .avif({ quality: 75, effort: 0 })
        .toBuffer();
    console.timeEnd('convertImageToAvif.sharp.toBuffer');
    const newFilePath = (0, exports.getUniqueFilename)(filePath.replace(/\.[^.]+$/, '.avif'));
    console.time('convertImageToAvif.sharp.toFile');
    await (0, sharp_1.default)(image).toFile(newFilePath);
    console.timeEnd('convertImageToAvif.sharp.toFile');
    const testNewFilePath = (0, exports.getUniqueFilename)(newFilePath);
    console.time('convertImageToAvif.fs.writeFile');
    const fileStats = fs_1.default.statSync(newFilePath);
    console.log('convertImageToAvif.sharp.fileSize', (0, formatters_1.formatFileSize)(fileStats.size));
    await fs_1.default.writeFileSync(testNewFilePath, image);
    console.timeEnd('convertImageToAvif.fs.writeFile');
    const testFileStats = fs_1.default.statSync(testNewFilePath);
    console.log('convertImageToAvif.fs.writeFileSync.fileSize', (0, formatters_1.formatFileSize)(testFileStats.size));
    fs_1.default.unlinkSync(testNewFilePath);
    fs_1.default.unlinkSync(filePath);
    console.timeEnd('convertImageToAvif');
    return newFilePath;
};
exports.convertImageToAvif = convertImageToAvif;
const convertImageToWebp = async (filePath, mimeType) => {
    if (!mimeType || !mimeType.startsWith('image/') || mimeType === 'image/gif') {
        return filePath;
    }
    if (mimeType === 'image/heic') {
        console.time('convertImageToWebp.heicConvert');
        const inputBuffer = await fs_1.default.readFileSync(filePath);
        const outputBuffer = await (0, heic_convert_1.default)({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 1
        });
        const newFilePath = (0, exports.getUniqueFilename)(filePath.replace(/\.[^.]+$/, '.jpg'));
        fs_1.default.writeFileSync(newFilePath, Buffer.from(outputBuffer));
        fs_1.default.unlinkSync(filePath);
        filePath = newFilePath;
        mimeType = 'image/jpeg';
        console.timeEnd('convertImageToWebp.heicConvert');
    }
    console.time('convertImageToWebp');
    console.time('convertImageToWebp.sharp.toBuffer');
    const image = await (0, sharp_1.default)(filePath)
        .resize({ height: 2160, withoutEnlargement: true })
        .webp({ quality: 75, effort: 0 })
        .toBuffer();
    console.timeEnd('convertImageToWebp.sharp.toBuffer');
    const newFilePath = (0, exports.getUniqueFilename)(filePath.replace(/\.[^.]+$/, '.webp'));
    // console.time('convertImageToWebp.sharp.toFile');
    // await sharp(image).toFile(newFilePath);
    // console.timeEnd('convertImageToWebp.sharp.toFile');
    console.time('convertImageToWebp.writeFileSync');
    await fs_1.default.writeFileSync(newFilePath, image);
    console.timeEnd('convertImageToWebp.writeFileSync');
    fs_1.default.unlinkSync(filePath);
    console.timeEnd('convertImageToWebp');
    return newFilePath;
};
exports.convertImageToWebp = convertImageToWebp;
class LocalStorageProvider {
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    async saveFile(filePath, destinationPath) {
        return null;
    }
    async deleteFile(filePath) {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    getFilePath(filePath) {
        return path_1.default.join(this.baseDir, filePath);
    }
    async getFile(filePath, localPath) {
        return fs_1.default.readFileSync(localPath);
    }
}
class S3StorageProvider {
    constructor(bucket, region, accessKeyId, secretAccessKey) {
        this.bucket = bucket;
        this.region = region;
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.s3Client = new client_s3_1.S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
        });
    }
    async saveFile(filePath, destinationPath) {
        const upload = new lib_storage_1.Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucket,
                Key: destinationPath,
                Body: fs_1.default.createReadStream(filePath),
            },
        });
        await upload.done();
        fs_1.default.unlinkSync(filePath);
        return destinationPath;
    }
    async deleteFile(filePath) {
        await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        }));
    }
    async checkIfFileExist(key) {
        try {
            await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            return true;
        }
        catch (error) {
            return false;
        }
    }
    ;
    async getFile(filePath, localPath) {
        if (filePath === localPath || !this.checkIfFileExist(filePath)) {
            return fs_1.default.readFileSync(localPath);
        }
        const result = await this.s3Client.send(new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        }));
        return result.Body;
    }
    getFilePath(filePath) {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
    }
}
function createStorageProvider() {
    if (process.env.USE_S3_STORAGE === 'true') {
        return new S3StorageProvider(process.env.AWS_BUCKET_NAME, process.env.AWS_REGION, process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY);
    }
    if (!fs_1.default.existsSync(exports.UPLOAD_DIR))
        fs_1.default.mkdirSync(exports.UPLOAD_DIR, { recursive: true });
    return new LocalStorageProvider(exports.UPLOAD_DIR);
}
//# sourceMappingURL=storage.js.map