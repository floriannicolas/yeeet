"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const schema_1 = require("../db/schema");
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const session_1 = require("../session");
const email_1 = require("../services/email");
const tokens_1 = require("../lib/tokens");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
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
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await database_1.db.insert(schema_1.usersTable).values({
            username,
            email,
            password: hashedPassword
        });
        res.status(200).send({ message: 'Register successful' });
    }
    catch (error) {
        if (error.code === '23505') {
            res.status(400).json({
                errors: {
                    username: ['Username already exists'],
                },
            });
        }
        else {
            console.error(error);
            res.status(500).json({
                message: 'Server error'
            });
        }
    }
});
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await database_1.db.select().from(schema_1.usersTable)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.usersTable.username, username), (0, drizzle_orm_1.eq)(schema_1.usersTable.email, username)))
            .limit(1);
        if (user.length > 0) {
            const isPasswordValid = await bcrypt_1.default.compare(password, user[0].password);
            if (isPasswordValid) {
                const token = (0, session_1.generateSessionToken)();
                await (0, session_1.createSession)(token, user[0].id);
                // setSessionTokenCookie(res as Response, token, session.expiresAt);
                res.status(200).send({
                    id: user[0].id,
                    username: user[0].username,
                    email: user[0].email,
                    token: token,
                });
            }
            else {
                res.status(401).send('Invalid password');
            }
        }
        else {
            res.status(404).send('User not found');
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await database_1.db.select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.email, email))
            .limit(1);
        if (user.length === 0) {
            // Pour des raisons de sécurité, on renvoie toujours un succès
            res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
            return;
        }
        const resetToken = (0, tokens_1.generateRandomToken)();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 heure
        await database_1.db.insert(schema_1.passwordResetTokensTable).values({
            userId: user[0].id,
            token: resetToken,
            expiresAt
        });
        await (0, email_1.sendPasswordResetEmail)(email, resetToken);
        res.json({ message: 'If an account exists with that email, you will receive password reset instructions.' });
    }
    catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'An internal error occurred, please try later.' });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const resetToken = await database_1.db.select()
            .from(schema_1.passwordResetTokensTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.passwordResetTokensTable.token, token), (0, drizzle_orm_1.isNull)(schema_1.passwordResetTokensTable.usedAt), (0, drizzle_orm_1.gt)(schema_1.passwordResetTokensTable.expiresAt, new Date())))
            .limit(1);
        if (resetToken.length === 0) {
            res.status(400).json({ message: 'Invalid or expired reset token. Please ask a new mail using the "forgot password?" feature.' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        await database_1.db.transaction(async (tx) => {
            await tx.update(schema_1.usersTable)
                .set({ password: hashedPassword })
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, resetToken[0].userId));
            await tx.update(schema_1.passwordResetTokensTable)
                .set({ usedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.passwordResetTokensTable.id, resetToken[0].id));
        });
        res.json({ message: 'Password reset successful.' });
    }
    catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'An internal error occurred, please try later.' });
    }
});
router.get('/check-auth', async (req, res) => {
    const token = (0, session_1.getTokenFromRequest)(req);
    let isAuthenticated = false;
    let userId = null;
    let lastAppVersion = null;
    if (token) {
        const { user } = await (0, session_1.validateSessionToken)(token);
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
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ message: 'Error logging out' });
        }
        else {
            const token = (0, session_1.getTokenFromRequest)(req);
            (0, session_1.invalidateSession)(token);
            // deleteSessionTokenCookie(res as Response);
            res.json({ message: 'Logged out successfully' });
        }
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map