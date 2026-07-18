/**
 * Minimal, dependency-free auth for Project Nova.
 * Sessions are HMAC-signed cookies (tamper-proof) using Web Crypto, so the
 * same code runs in both edge middleware and Node route handlers.
 */

export type Role = "admin" | "member";

export interface Session {
  user: string;
  role: Role;
}

export const COOKIE_NAME = "nova_session";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret(): string {
  return process.env.NOVA_SECRET || "dev-insecure-secret-change-me";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createToken(session: Session): Promise<string> {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify(session)));
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifyToken(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    return JSON.parse(decoder.decode(base64UrlToBytes(payload))) as Session;
  } catch {
    return null;
  }
}

interface StoredUser {
  user: string;
  password: string;
  role: Role;
}

/**
 * User store from env NOVA_USERS ("user:pass:role,user:pass:role").
 * Falls back to demo accounts so the app is usable out of the box.
 */
function getUsers(): StoredUser[] {
  const raw = process.env.NOVA_USERS?.trim();
  if (!raw) {
    return [
      { user: "admin", password: "nova", role: "admin" },
      { user: "member", password: "nova", role: "member" },
    ];
  }
  return raw
    .split(",")
    .map((entry) => entry.split(":"))
    .filter((parts) => parts.length >= 2)
    .map(([user, password, role]) => ({
      user: user.trim(),
      password: password.trim(),
      role: (role?.trim() === "admin" ? "admin" : "member") as Role,
    }));
}

export function authenticate(username: string, password: string): Session | null {
  const match = getUsers().find((u) => u.user === username && u.password === password);
  return match ? { user: match.user, role: match.role } : null;
}
