import { supabaseAdmin } from "@/lib/supabase/admin";
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

const USER_COLUMNS = "id, name, phone, passwordHash:password_hash, createdAt:created_at";

function toPublicUser(user: User): PublicUser {
    return { id: user.id, name: user.name, phone: user.phone };
}

export async function findUserByPhone(phone: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
        .from("users")
        .select(USER_COLUMNS)
        .eq("phone", phone)
        .maybeSingle();
    if (error) throw new Error("USER_LOOKUP_FAILED");
    return data;
}

export async function createUser(name: string, phone: string, password: string): Promise<PublicUser> {
    const { data, error } = await supabaseAdmin
        .from("users")
        .insert({ name, phone, password_hash: hashSecret(password) })
        .select("id, name, phone")
        .single();
    if (error || !data) throw new Error("USER_CREATE_FAILED");
    return data;
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
    const { data, error } = await supabaseAdmin
        .from("sessions")
        .insert({ user_id: userId })
        .select("token")
        .single();
    if (error || !data) throw new Error("SESSION_CREATE_FAILED");
    return data.token;
}

export async function getUserBySessionToken(token: string): Promise<PublicUser | null> {
    const { data: session } = await supabaseAdmin
        .from("sessions")
        .select("user_id")
        .eq("token", token)
        .maybeSingle();
    if (!session) return null;

    const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, name, phone")
        .eq("id", session.user_id)
        .maybeSingle();
    return user ?? null;
}

export async function deleteSession(token: string): Promise<void> {
    await supabaseAdmin.from("sessions").delete().eq("token", token);
}
