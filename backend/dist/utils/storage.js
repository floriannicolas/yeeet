"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertBytesToMb = void 0;
exports.getUserStorageUsed = getUserStorageUsed;
exports.getMaxUserStorageSpace = getMaxUserStorageSpace;
exports.hasEnoughStorageSpace = hasEnoughStorageSpace;
const database_1 = require("../database");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
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
//# sourceMappingURL=storage.js.map