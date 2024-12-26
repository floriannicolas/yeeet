import { type User, type Session, sessionsTable, usersTable } from './db/schema';
import { eq } from 'drizzle-orm';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { sha256 } from '@oslojs/crypto/sha2';
import { db } from './database';
import crypto from 'crypto';
import type { Response } from 'express';


export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(token: string, userId: number): Promise<Session> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
	};
	await db.insert(sessionsTable).values(session);
	return session;
}

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const result = await db
		.select({ user: usersTable, session: sessionsTable })
		.from(sessionsTable)
		.innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
		.where(eq(sessionsTable.id, sessionId));
	if (result.length < 1) {
		return { session: null, user: null };
	}
	const { user, session } = result[0];
	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessionsTable).where(eq(sessionsTable.id, session.id));
		return { session: null, user: null };
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await db
			.update(sessionsTable)
			.set({
				expiresAt: session.expiresAt
			})
			.where(eq(sessionsTable.id, session.id));
	}
	return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
}

export type SessionValidationResult =
	| { session: Session; user: User }
	| { session: null; user: null };


export function setSessionTokenCookie(response: Response, token: string, expiresAt: Date): void {
	const cookieOptions = {
		httpOnly: true,
		secure: (process.env.TRANSFERT_PROTOCOL === 'https'),
		sameSite: 'None' as const, // Permet le cross-origin
		path: '/',
		maxAge: expiresAt.getTime() - Date.now(),
	};

	response.setHeader(
		'Set-Cookie',
		`session=${token}; ${Object.entries(cookieOptions)
			.map(([key, value]) => `${key}=${value}`)
			.join('; ')}`
	);
}

export function deleteSessionTokenCookie(response: Response): void {
	if (process.env.TRANSFERT_PROTOCOL === 'https') {
		// When deployed over HTTPS
			response.setHeader(
				"Set-Cookie",
				"session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/; Secure;"
			);
	} else {
		// When deployed over HTTP (localhost)
		response.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/");
	}
}

