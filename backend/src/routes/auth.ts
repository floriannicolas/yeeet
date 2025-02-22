import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { usersTable, passwordResetTokensTable } from '../db/schema';
import bcrypt from 'bcrypt';
import { or, eq, and, isNull, gt } from 'drizzle-orm';
import { generateSessionToken, createSession, invalidateSession, validateSessionToken, getTokenFromRequest } from '../session';
import { EmailService } from '../services/email';
import { generateRandomToken } from '../lib/tokens';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
    const { username, email, password, invitationKey } = req.body;
    if (invitationKey !== 'YEEEEEEEEEEEEET') {
        res.status(401).json({
            errors: {
                invitationKey: ['Invalid invitation key. You need an invitation key to create an account'],
            },
        });
        return;
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.insert(usersTable).values({
            username,
            email,
            password: hashedPassword
        });
        res.status(200).send({ message: 'Register successful' });
    } catch (error: any) {
        if (error.code === '23505') {
            res.status(400).json({
                errors: {
                    username: ['Username already exists'],
                },
            });
        } else {
            console.error(error);
            res.status(500).json({
                message: 'Server error'
            });
        }
    }
});

router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const user = await db.select().from(usersTable)
            .where(or(eq(usersTable.username, username), eq(usersTable.email, username)))
            .limit(1);
        if (user.length > 0) {
            const isPasswordValid = await bcrypt.compare(password, user[0].password);
            if (isPasswordValid) {
                const token = generateSessionToken();
                await createSession(token, user[0].id);
                // setSessionTokenCookie(res as Response, token, session.expiresAt);
                res.status(200).send({
                    id: user[0].id,
                    username: user[0].username,
                    email: user[0].email,
                    token: token,
                });
            } else {
                res.status(401).send('Invalid password');
            }
        } else {
            res.status(404).send('User not found');
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await db.select()
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);

        if (user.length === 0) {
            // Pour des raisons de sécurité, on renvoie toujours un succès
            res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
            return;
        }

        const resetToken = generateRandomToken();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure

        await db.insert(passwordResetTokensTable).values({
            userId: user[0].id,
            token: resetToken,
            expiresAt
        });

        await EmailService.sendPasswordResetEmail(email, resetToken);
        res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'An internal error occurred, please try later.' });
    }
});

router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;

        const resetToken = await db.select()
            .from(passwordResetTokensTable)
            .where(
                and(
                    eq(passwordResetTokensTable.token, token),
                    isNull(passwordResetTokensTable.usedAt),
                    gt(passwordResetTokensTable.expiresAt, new Date())
                )
            )
            .limit(1);

        if (resetToken.length === 0) {
            res.status(400).json({ message: 'Invalid or expired reset token. Please ask a new mail using the "forgot password?" feature.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.transaction(async (tx) => {
            await tx.update(usersTable)
                .set({ password: hashedPassword })
                .where(eq(usersTable.id, resetToken[0].userId));

            await tx.update(passwordResetTokensTable)
                .set({ usedAt: new Date() })
                .where(eq(passwordResetTokensTable.id, resetToken[0].id));
        });

        res.json({ message: 'Password reset successful.' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'An internal error occurred, please try later.' });
    }
});

router.get('/check-auth', async (req: Request, res: Response) => {
    const token = getTokenFromRequest(req);
    let isAuthenticated = false;
    let userId = null;
    let lastAppVersion = null;
    if (token) {
        const { user } = await validateSessionToken(token);
        isAuthenticated = !!user;
        userId = user?.id;
        lastAppVersion = user?.lastAppVersion;
    }
    res.json({
        isAuthenticated,
        userId,
        lastAppVersion,
    });
});

router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ message: 'Error logging out' });
        } else {
            const token = getTokenFromRequest(req);
            invalidateSession(token);
            // deleteSessionTokenCookie(res as Response);
            res.json({ message: 'Logged out successfully' });
        }
    });
});

export default router;