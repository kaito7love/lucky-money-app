import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { readJson, writeJson } from "@/lib/jsonDb";

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

function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
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
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    await writeJson(USERS_FILE, users);
    return toPublicUser(user);
}

export async function verifyLogin(phone: string, password: string): Promise<PublicUser | null> {
    const user = await findUserByPhone(phone);
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    return toPublicUser(user);
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
