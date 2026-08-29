import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashSecret(secret: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(secret, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

export function verifySecret(secret: string, stored: string): boolean {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(secret, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
