"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStorageService = void 0;
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
class UserStorageService {
    static async getUserStorageUsed(userId) {
        const result = await database_1.db
            .select({ totalSize: (0, drizzle_orm_1.sum)(schema_1.filesTable.size) })
            .from(schema_1.filesTable)
            .where((0, drizzle_orm_1.eq)(schema_1.filesTable.userId, userId));
        const totalSize = result[0].totalSize;
        if (totalSize) {
            return parseInt(totalSize);
        }
        return 0;
    }
    static async getMaxUserStorageSpace(userId, limit) {
        const usedStorage = await UserStorageService.getUserStorageUsed(userId);
        return limit - usedStorage;
    }
    static async hasEnoughStorageSpace(userId, limit, fileSize) {
        const usedStorage = await UserStorageService.getUserStorageUsed(userId);
        return usedStorage + fileSize <= limit;
    }
}
exports.UserStorageService = UserStorageService;
//# sourceMappingURL=user-storage.js.map