import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

/*
 * Password hashing.
 * Cost factor 12 ≈ 250ms on modern hardware — slow enough to blunt brute force,
 * fast enough that login feels instant. Don't go below 10 (too fast).
 */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/*
 * Single-use token primitive used by both password reset and email verification.
 *
 * We generate a random URL-safe token, send it to the user's email, but store
 * only the SHA-256 hash in the DB. If the database leaks, an attacker can't
 * use the leaked rows to reset/verify accounts — they'd need the original token,
 * which only ever existed in the email and the user's URL bar.
 *
 * SHA-256 is fine here (not bcrypt) because the token is high-entropy random
 * bytes — there's nothing to brute-force.
 */
export function generateOpaqueToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url"); // ~43 chars, URL-safe
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Backward-compat aliases — existing call sites use these names.
export const generateResetToken = generateOpaqueToken;
export const hashResetToken = hashOpaqueToken;
