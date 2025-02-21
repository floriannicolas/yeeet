import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { cronJobsTable } from '../db/schema';
import { cleanupExpiredFiles, CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES } from '../tasks/cleanup';
import { lt, eq, and, gte } from 'drizzle-orm';

const router = Router();

router.get('/cron-jobs', async (req: Request, res: Response): Promise<void> => {
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

        const cronJobCleanupExpiredFiles = await db.select()
            .from(cronJobsTable)
            .where(
                and(
                    eq(cronJobsTable.type, CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES),
                    gte(cronJobsTable.createdAt, today),
                    lt(cronJobsTable.createdAt, tomorrow)
                )
            )
            .limit(1);

        if (cronJobCleanupExpiredFiles.length === 0) {
            await db.insert(cronJobsTable).values({
                type: CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES
            });
            cleanupExpiredFiles();
            jobsLaunched.push(CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
        } else {
            jobsAlreadyLaunched.push(CRON_JOB_TYPE_CLEANUP_EXPIRED_FILES);
        }

        if (jobsLaunched.length > 0) {
            await db.delete(cronJobsTable)
                .where(lt(cronJobsTable.createdAt, today));
        }

        res.json({
            status: 'success',
            jobsLaunched,
            jobsAlreadyLaunched
        });
    } catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ message: 'Error getting storage info' });
    }
});

export default router;