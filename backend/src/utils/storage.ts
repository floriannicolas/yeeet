import { db } from '../database';
import { filesTable } from '../db/schema';
import { eq, sum } from 'drizzle-orm';

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