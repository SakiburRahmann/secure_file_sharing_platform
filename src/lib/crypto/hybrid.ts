/**
 * Core Hybrid Encryption (RSA-OAEP + AES-GCM)
 * This handles asymmetric key wrapping and symmetric data encryption.
 */

const AES_ALGO = "AES-GCM";
const RSA_ALGO = "RSA-OAEP";

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Generates an RSA-OAEP Key Pair for the user.
 */
export async function generateRSAKeyPair(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey(
    {
      name: RSA_ALGO,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // Extractable (private key will be encrypted before export)
    ["encrypt", "decrypt"]
  );

  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

/**
 * Exports a CryptoKey to a serializable ArrayBuffer.
 */
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey(key.type === "public" ? "spki" : "pkcs8", key);
}

/**
 * Imports a CryptoKey from a serializable ArrayBuffer.
 */
export async function importKey(
  data: ArrayBuffer,
  type: "public" | "private",
  algo: string = RSA_ALGO
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    type === "public" ? "spki" : "pkcs8",
    data,
    { name: algo, hash: "SHA-256" },
    true,
    type === "public" ? ["encrypt"] : ["decrypt"]
  );
}

/**
 * Converts ArrayBuffer to Base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

/**
 * Converts Base64 string back to ArrayBuffer.
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts a session key (AES) using a recipient's RSA Public Key.
 */
export async function wrapKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  return crypto.subtle.encrypt(
    { name: RSA_ALGO },
    publicKey,
    rawKey
  );
}

/**
 * Decrypts a session key (AES) using the user's RSA Private Key.
 */
export async function unwrapKey(
  encryptedKey: ArrayBuffer,
  privateKey: CryptoKey
): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.decrypt(
    { name: RSA_ALGO },
    privateKey,
    encryptedKey
  );

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: AES_ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random AES-GCM session key.
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: AES_ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates a random Initialization Vector for AES.
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM
}
