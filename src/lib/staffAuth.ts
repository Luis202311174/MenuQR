import { randomBytes, pbkdf2Sync, createHash } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, derived] = storedHash.split(":");
  if (!salt || !derived) return false;
  const testHash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return testHash === derived;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
