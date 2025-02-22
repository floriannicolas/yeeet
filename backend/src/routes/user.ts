import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { validateSessionToken, getTokenFromRequest } from '../session';
import { requireAuth } from '../middleware/auth';
import { UserStorageService } from '../services/user-storage';

const router = Router();

router.post('/update-app-version', requireAuth, async (req: Request, res: Response) => {
    const { appVersion } = req.body;
    let userId = -1;
    const token = getTokenFromRequest(req);
    if (token) {
        const { user } = await validateSessionToken(token);
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        userId = user.id;
    } else {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    await db.update(usersTable).set({ lastAppVersion: appVersion }).where(eq(usersTable.id, userId));
    res.json({ message: 'App version updated' });
});

router.get('/storage-info', requireAuth, async (req: Request, res: Response): Promise<void> => {
    try {
        const { user } = await validateSessionToken(getTokenFromRequest(req)!);
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const usedStorage = await UserStorageService.getUserStorageUsed(user.id);
        res.json({
            used: usedStorage,
            limit: user.storageLimit,
            available: user.storageLimit - usedStorage,
            usedPercentage: Math.round((usedStorage / user.storageLimit) * 100)
        });
    } catch (error) {
        console.error('Error getting storage info:', error);
        res.status(500).json({ message: 'Error getting storage info' });
    }
});

export default router;