import path from 'path';
import { db } from '../config/database';
import { filesTable } from '../db/schema';
import { eq, sum } from 'drizzle-orm';

export class UserStorageService {
    static async getUserStorageUsed(userId: number): Promise<number> {
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

    static async getMaxUserStorageSpace(userId: number, limit: number): Promise<number> {
        const usedStorage = await UserStorageService.getUserStorageUsed(userId);
        return limit - usedStorage;
    }

    static async hasEnoughStorageSpace(userId: number, limit: number, fileSize: number): Promise<boolean> {
        const usedStorage = await UserStorageService.getUserStorageUsed(userId);
        return (usedStorage + fileSize) <= limit;
    }
}

