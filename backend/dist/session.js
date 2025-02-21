"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenFromRequest = void 0;
exports.generateSessionToken = generateSessionToken;
exports.createSession = createSession;
exports.validateSessionToken = validateSessionToken;
exports.invalidateSession = invalidateSession;
exports.setSessionTokenCookie = setSessionTokenCookie;
exports.deleteSessionTokenCookie = deleteSessionTokenCookie;
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const database_1 = require("./config/database");
const crypto_1 = __importDefault(require("crypto"));
function generateSessionToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Get the token from the request.
 * @param req
 * @returns
 */
const getTokenFromRequest = (req) => {
    const token = req.cookies?.session;
    if (token) {
        return token;
    }
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const [type, token] = authHeader.split(' ');
        if (type === 'Bearer') {
            return token;
        }
    }
    return null;
};
exports.getTokenFromRequest = getTokenFromRequest;
async function createSession(token, userId) {
    const session = {
        id: token,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    };
    await database_1.db.insert(schema_1.sessionsTable).values(session);
    return session;
}
async function validateSessionToken(token) {
    const result = await database_1.db
        .select({ user: schema_1.usersTable, session: schema_1.sessionsTable })
        .from(schema_1.sessionsTable)
        .innerJoin(schema_1.usersTable, (0, drizzle_orm_1.eq)(schema_1.sessionsTable.userId, schema_1.usersTable.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionsTable.id, token));
    if (result.length < 1) {
        return { session: null, user: null };
    }
    const { user, session } = result[0];
    if (Date.now() >= session.expiresAt.getTime()) {
        await database_1.db.delete(schema_1.sessionsTable).where((0, drizzle_orm_1.eq)(schema_1.sessionsTable.id, session.id));
        return { session: null, user: null };
    }
    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
        session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        await database_1.db
            .update(schema_1.sessionsTable)
            .set({
            expiresAt: session.expiresAt
        })
            .where((0, drizzle_orm_1.eq)(schema_1.sessionsTable.id, session.id));
    }
    return { session, user };
}
async function invalidateSession(sessionId) {
    await database_1.db.delete(schema_1.sessionsTable).where((0, drizzle_orm_1.eq)(schema_1.sessionsTable.id, sessionId));
}
function setSessionTokenCookie(response, token, expiresAt) {
    const cookieOptions = {
        httpOnly: true,
        secure: (process.env.TRANSFERT_PROTOCOL === 'https'),
        sameSite: 'None', // Permet le cross-origin
        path: '/',
        maxAge: expiresAt.getTime() - Date.now(),
        partitioned: true
    };
    response.setHeader('Set-Cookie', `session=${token}; ${Object.entries(cookieOptions)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`);
}
function deleteSessionTokenCookie(response) {
    if (process.env.TRANSFERT_PROTOCOL === 'https') {
        // When deployed over HTTPS
        response.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=None; Max-Age=0; Path=/; Secure; Partitioned;");
    }
    else {
        // When deployed over HTTP (localhost)
        response.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/");
    }
}
//# sourceMappingURL=session.js.map