import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { formatFileSize } from '../lib/formatters';
import heicConvert from 'heic-convert';
import { db } from '../config/database';
import { filesTable } from '../db/schema';
import { eq, sum } from 'drizzle-orm';

export const UPLOAD_DIR = process.env.VERCEL
    ? '/tmp'
    : path.join(__dirname, '..', '..', 'uploads');

export const convertBytesToMb = (bytes: number) => {
    return Math.round(bytes / (1024 * 1024));
}

export async function getUserStorageUsed(userId: number): Promise<number> {
    const result = await db
        .select({ totalSize: sum(filesTable.size) })
        .from(filesTable)
        .where(eq(filesTable.userId, userId));

    let totalSize = result[0].totalSize;
    if (totalSize) {
        return parseInt(totalSize);
    }
    return 0;
}

export async function getMaxUserStorageSpace(userId: number, limit: number): Promise<number> {
    const usedStorage = await getUserStorageUsed(userId);
    return limit - usedStorage;
}

export async function hasEnoughStorageSpace(userId: number, limit: number, fileSize: number): Promise<boolean> {
    const usedStorage = await getUserStorageUsed(userId);
    return (usedStorage + fileSize) <= limit;
}

export interface StorageProvider {
    saveFile(filePath: string, destinationPath: string): Promise<string | null>;
    deleteFile(filePath: string): Promise<void>;
    getFilePath(filePath: string): string;
    getFile(filePath: string, localPath: string): Promise<any>;
}

export const getUniqueFilename = (originalPath: string) => {
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

export const convertImageToAvif = async (filePath: string, mimeType: string | null): Promise<string> => {
    if (!mimeType || !mimeType.startsWith('image/')) {
        return filePath;
    }
    console.time('convertImageToAvif');
    console.time('convertImageToAvif.sharp.toBuffer');
    const image = await sharp(filePath)
        .resize({ height: 2160, withoutEnlargement: true })
        .avif({ quality: 75, effort: 0 })
        .toBuffer();
    console.timeEnd('convertImageToAvif.sharp.toBuffer');
    const newFilePath = getUniqueFilename(filePath.replace(/\.[^.]+$/, '.avif'));
    console.time('convertImageToAvif.sharp.toFile');
    await sharp(image).toFile(newFilePath);
    console.timeEnd('convertImageToAvif.sharp.toFile');

    const testNewFilePath = getUniqueFilename(newFilePath);
    console.time('convertImageToAvif.fs.writeFile');
    const fileStats = fs.statSync(newFilePath);
    console.log('convertImageToAvif.sharp.fileSize', formatFileSize(fileStats.size));
    await fs.writeFileSync(testNewFilePath, image);
    console.timeEnd('convertImageToAvif.fs.writeFile');
    const testFileStats = fs.statSync(testNewFilePath);
    console.log('convertImageToAvif.fs.writeFileSync.fileSize', formatFileSize(testFileStats.size));
    fs.unlinkSync(testNewFilePath);
    fs.unlinkSync(filePath);
    console.timeEnd('convertImageToAvif');

    return newFilePath;
}

export const convertImageToWebp = async (filePath: string, mimeType: string | null): Promise<string> => {
    if (!mimeType || !mimeType.startsWith('image/') || mimeType === 'image/gif') {
        return filePath;
    }
    if (mimeType === 'image/heic') {
        console.time('convertImageToWebp.heicConvert');
        const inputBuffer = await fs.readFileSync(filePath);
        const outputBuffer = await heicConvert({
            buffer: inputBuffer,
            format: 'JPEG',
            quality: 1
        });
        const newFilePath = getUniqueFilename(filePath.replace(/\.[^.]+$/, '.jpg'));
        fs.writeFileSync(newFilePath, Buffer.from(outputBuffer));
        fs.unlinkSync(filePath);
        filePath = newFilePath;
        mimeType = 'image/jpeg';
        console.timeEnd('convertImageToWebp.heicConvert');
    }

    console.time('convertImageToWebp');
    console.time('convertImageToWebp.sharp.toBuffer');
    const image = await sharp(filePath)
        .resize({ height: 2160, withoutEnlargement: true })
        .webp({ quality: 75, effort: 0 })
        .toBuffer();
    console.timeEnd('convertImageToWebp.sharp.toBuffer');
    const newFilePath = getUniqueFilename(filePath.replace(/\.[^.]+$/, '.webp'));
    // console.time('convertImageToWebp.sharp.toFile');
    // await sharp(image).toFile(newFilePath);
    // console.timeEnd('convertImageToWebp.sharp.toFile');
    console.time('convertImageToWebp.writeFileSync');
    await fs.writeFileSync(newFilePath, image);
    console.timeEnd('convertImageToWebp.writeFileSync');
    fs.unlinkSync(filePath);
    console.timeEnd('convertImageToWebp');

    return newFilePath;
}


class LocalStorageProvider implements StorageProvider {
    constructor(private baseDir: string) { }

    async saveFile(filePath: string, destinationPath: string): Promise<string | null> {
        return null;
    }

    async deleteFile(filePath: string): Promise<void> {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    getFilePath(filePath: string): string {
        return path.join(this.baseDir, filePath);
    }

    async getFile(filePath: string, localPath: string): Promise<any> {
        return fs.readFileSync(localPath);
    }
}

class S3StorageProvider implements StorageProvider {
    private s3Client: S3Client;

    constructor(
        private bucket: string,
        private region: string,
        private accessKeyId: string,
        private secretAccessKey: string
    ) {
        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
        });
    }

    async saveFile(filePath: string, destinationPath: string): Promise<string | null> {
        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucket,
                Key: destinationPath,
                Body: fs.createReadStream(filePath),
            },
        });

        await upload.done();
        fs.unlinkSync(filePath);
        return destinationPath;
    }

    async deleteFile(filePath: string): Promise<void> {
        await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        }));
    }

    async checkIfFileExist(key: string): Promise<boolean> {
        try {
            await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                })
            );
            return true;
        } catch (error) {
            return false;
        }
    };

    async getFile(filePath: string, localPath: string): Promise<any> {
        if (filePath === localPath || !this.checkIfFileExist(filePath)) {
            return fs.readFileSync(localPath);
        }

        const result = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        }));

        return result.Body;
    }

    getFilePath(filePath: string): string {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
    }
}

export function createStorageProvider(): StorageProvider {
    if (process.env.USE_S3_STORAGE === 'true') {
        return new S3StorageProvider(
            process.env.AWS_BUCKET_NAME!,
            process.env.AWS_REGION!,
            process.env.AWS_ACCESS_KEY_ID!,
            process.env.AWS_SECRET_ACCESS_KEY!
        );
    }


    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    return new LocalStorageProvider(UPLOAD_DIR);
} 