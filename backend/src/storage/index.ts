import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';


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

    const image = await sharp(filePath)
        .resize({ height: 2160, withoutEnlargement: true })
        .avif({ quality: 75, effort: 0 })
        .toBuffer();
    const newFilePath = getUniqueFilename(filePath.replace(/\.[^.]+$/, '.avif'));
    await sharp(image).toFile(newFilePath);
    fs.unlinkSync(filePath);

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

    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    return new LocalStorageProvider(uploadDir);
} 