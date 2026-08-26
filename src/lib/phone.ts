export const PHONE_RE = /^\+?[0-9]{8,15}$/;

export function normalizePhone(phone: string): string {
    return phone.trim().replace(/[\s-]/g, "");
}

export function isValidPhone(phone: string): boolean {
    return PHONE_RE.test(phone);
}
