import { randomBytes, pbkdf2Sync, createHash } from "crypto";
import { supabase } from "./supabaseClient";

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

// Staff sign-in using Supabase
export async function signInStaff(email: string, password: string) {
  // You may want to check for staff role here
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { success: false, message: error.message };
  }
  // Optionally, check if user is staff
  // ...
  return { success: true };
}

// Staff Google sign-in using Supabase
export async function signInStaffWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/business/staff-login/google-callback` : undefined,
    },
  });
  if (error) {
    return { success: false, message: error.message };
  }
  return { success: true };
}
