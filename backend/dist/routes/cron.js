"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const cleanup_1 = require("../tasks/cleanup");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
router.get('/cron-jobs', async (req, res) => {
    try {
        if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const jobsLaunched = [];
        const jobsAlreadyLaunched = [];
        const cronJobCleanupExpiredFiles = await database_1.db
            .select()
            .from(schema_1.cronJobsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cronJobsTable.type, cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES), (0, drizzle_orm_1.gte)(schema_1.cronJobsTable.createdAt, today), (0, drizzle_orm_1.lt)(schema_1.cronJobsTable.createdAt, tomorrow)))
            .limit(1);
        if (cronJobCleanupExpiredFiles.length === 0) {
            await database_1.db.insert(schema_1.cronJobsTable).values({
                type: cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES,
            });
            (0, cleanup_1.cleanupExpiredFiles)();
            jobsLaunched.push(cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
        }
        else {
            jobsAlreadyLaunched.push(cleanup_1.CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
        }
        if (jobsLaunched.length > 0) {
            await database_1.db.delete(schema_1.cronJobsTable).where((0, drizzle_orm_1.lt)(schema_1.cronJobsTable.createdAt, today));
        }
        res.json({
            status: 'success',
            jobsLaunched,
            jobsAlreadyLaunched,
        });
    }
    catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ message: 'Error getting storage info' });
    }
});
exports.default = router;
//# sourceMappingURL=cron.js.map