/**
 * Cryptographic Web Worker
 * Offloads heavy encryption/decryption and hashing from the main thread.
 */

self.onmessage = async (event) => {
  const { type, data, key, iv } = event.data;

  try {
    let result;
    switch (type) {
      case "encrypt":
        result = await encrypt(data, key, iv);
        break;
      case "decrypt":
        result = await decrypt(data, key, iv);
        break;
      case "hash":
        result = await computeHash(data);
        break;
      default:
        throw new Error(`Unknown operation: ${type}`);
    }
    const transferableResult = result instanceof ArrayBuffer ? result : (result as any).buffer;
    self.postMessage({ type: "success", result }, [transferableResult] as any);
  } catch (error) {
    self.postMessage({ type: "error", message: (error as Error).message });
  }
};

async function encrypt(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data
  );
}

async function decrypt(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data
  );
}

async function computeHash(data: ArrayBuffer): Promise<ArrayBuffer> {
  return await crypto.subtle.digest("SHA-256", data);
}
