"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const session_1 = require("../session");
const auth_1 = require("../middleware/auth");
const user_storage_1 = require("../services/user-storage");
const router = (0, express_1.Router)();
router.post('/update-app-version', auth_1.requireAuth, async (req, res) => {
    const { appVersion } = req.body;
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
    await database_1.db.update(schema_1.usersTable).set({ lastAppVersion: appVersion }).where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId));
    res.json({ message: 'App version updated' });
});
router.get('/storage-info', auth_1.requireAuth, async (req, res) => {
    try {
        const { user } = await (0, session_1.validateSessionToken)((0, session_1.getTokenFromRequest)(req));
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const usedStorage = await user_storage_1.UserStorageService.getUserStorageUsed(user.id);
        res.json({
            used: usedStorage,
            limit: user.storageLimit,
            available: user.storageLimit - usedStorage,
            usedPercentage: Math.round((usedStorage / user.storageLimit) * 100),
        });
    }
    catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ message: 'Error getting storage info' });
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map