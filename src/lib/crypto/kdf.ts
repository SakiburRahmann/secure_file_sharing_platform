/**
 * Secure Key Derivation using PBKDF2 (Web Crypto API)
 * This is used to derive a Master Key from the user's password.
 */

const PBKDF2_ITERATIONS = 600000; // OWASP recommendation for 2024+
const SALT_LENGTH = 16; // 128 bits
const HASH_ALGO = "SHA-512";

/**
 * Derives a cryptographic key from a password and salt.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  usage: KeyUsage[] = ["encrypt", "decrypt"]
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGO,
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false, // Not extractable for security
    usage
  );
}

/**
 * Generates a random salt for PBKDF2.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}
