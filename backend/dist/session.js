"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionToken = generateSessionToken;
exports.createSession = createSession;
exports.validateSessionToken = validateSessionToken;
exports.invalidateSession = invalidateSession;
exports.setSessionTokenCookie = setSessionTokenCookie;
exports.deleteSessionTokenCookie = deleteSessionTokenCookie;
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const encoding_1 = require("@oslojs/encoding");
const sha2_1 = require("@oslojs/crypto/sha2");
const database_1 = require("./database");
const crypto_1 = __importDefault(require("crypto"));
function generateSessionToken() {
    const bytes = new Uint8Array(20);
    crypto_1.default.getRandomValues(bytes);
    const token = (0, encoding_1.encodeBase32LowerCaseNoPadding)(bytes);
    return token;
}
async function createSession(token, userId) {
    const sessionId = (0, encoding_1.encodeHexLowerCase)((0, sha2_1.sha256)(new TextEncoder().encode(token)));
    const session = {
        id: sessionId,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    };
    await database_1.db.insert(schema_1.sessionsTable).values(session);
    return session;
}
async function validateSessionToken(token) {
    const sessionId = (0, encoding_1.encodeHexLowerCase)((0, sha2_1.sha256)(new TextEncoder().encode(token)));
    const result = await database_1.db
        .select({ user: schema_1.usersTable, session: schema_1.sessionsTable })
        .from(schema_1.sessionsTable)
        .innerJoin(schema_1.usersTable, (0, drizzle_orm_1.eq)(schema_1.sessionsTable.userId, schema_1.usersTable.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionsTable.id, sessionId));
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
    if (process.env.NODE_ENV === 'production') {
        // When deployed over HTTPS
        response.setHeader("Set-Cookie", `session=${token}; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}; Path=/; Secure;`);
    }
    else {
        // When deployed over HTTP (localhost)
        response.setHeader("Set-Cookie", `session=${token}; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}; Path=/`);
    }
}
function deleteSessionTokenCookie(response) {
    if (process.env.NODE_ENV === 'production') {
        // When deployed over HTTPS
        response.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure;");
    }
    else {
        // When deployed over HTTP (localhost)
        response.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/");
    }
}
