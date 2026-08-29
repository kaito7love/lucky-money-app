import { randomUUID } from "crypto";
import { readJson, writeJson } from "@/lib/jsonDb";
import { hashSecret, verifySecret } from "@/lib/hash";

const DEFAULT_PASSWORD = "123456";

export interface User {
    id: string;
    name: string;
    phone: string;
    passwordHash: string;
    createdAt: string;
}

export interface PublicUser {
    id: string;
    name: string;
    phone: string;
}

interface Session {
    token: string;
    userId: string;
    createdAt: string;
}

const USERS_FILE = "users.json";
const SESSIONS_FILE = "sessions.json";

function toPublicUser(user: User): PublicUser {
    return { id: user.id, name: user.name, phone: user.phone };
}

export async function findUserByPhone(phone: string): Promise<User | null> {
    const users = await readJson<User[]>(USERS_FILE, []);
    return users.find((u) => u.phone === phone) ?? null;
}

export async function createUser(name: string, phone: string, password: string): Promise<PublicUser> {
    const users = await readJson<User[]>(USERS_FILE, []);
    const user: User = {
        id: randomUUID(),
        name,
        phone,
        passwordHash: hashSecret(password),
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    await writeJson(USERS_FILE, users);
    return toPublicUser(user);
}

export async function verifyLogin(phone: string, password: string): Promise<PublicUser | null> {
    const user = await findUserByPhone(phone);
    if (!user || !verifySecret(password, user.passwordHash)) return null;
    return toPublicUser(user);
}

/**
 * Lightweight identity for hosts/claimants: a known phone number is treated
 * as already "logged in" (account created transparently with a fixed
 * password), a new phone number needs a name to register. Used by pool
 * creation (host) and claiming (recipient) so neither flow shows a password
 * field.
 */
export async function findOrCreateUserByPhone(phone: string, name?: string): Promise<PublicUser> {
    const existing = await findUserByPhone(phone);
    if (existing) return toPublicUser(existing);
    const trimmedName = name?.trim();
    if (!trimmedName) throw new Error("NAME_REQUIRED");
    return createUser(trimmedName, phone, DEFAULT_PASSWORD);
}

export async function createSession(userId: string): Promise<string> {
    const sessions = await readJson<Session[]>(SESSIONS_FILE, []);
    const token = randomUUID();
    sessions.push({ token, userId, createdAt: new Date().toISOString() });
    await writeJson(SESSIONS_FILE, sessions);
    return token;
}

export async function getUserBySessionToken(token: string): Promise<PublicUser | null> {
    const sessions = await readJson<Session[]>(SESSIONS_FILE, []);
    const session = sessions.find((s) => s.token === token);
    if (!session) return null;
    const users = await readJson<User[]>(USERS_FILE, []);
    const user = users.find((u) => u.id === session.userId);
    return user ? toPublicUser(user) : null;
}

export async function deleteSession(token: string): Promise<void> {
    const sessions = await readJson<Session[]>(SESSIONS_FILE, []);
    await writeJson(SESSIONS_FILE, sessions.filter((s) => s.token !== token));
}
