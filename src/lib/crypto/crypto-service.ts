/**
 * Cryptographic Service
 * Provides a clean Promise-based API for the crypto worker.
 */

export class CryptoService {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(new URL('./crypto-worker.ts', import.meta.url));
  }

  public async encrypt(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
    return this.execute("encrypt", { data, key, iv });
  }

  public async decrypt(data: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<ArrayBuffer> {
    return this.execute("decrypt", { data, key, iv });
  }

  public async hash(data: ArrayBuffer): Promise<ArrayBuffer> {
    return this.execute("hash", { data });
  }

  private execute(type: string, payload: any): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        const { type: responseType, result, message } = event.data;
        if (responseType === "success") {
          resolve(result);
        } else {
          reject(new Error(message || "Unknown cryptographic error"));
        }
        this.worker.removeEventListener("message", listener);
      };

      this.worker.addEventListener("message", listener);
      this.worker.postMessage({ type, ...payload });
    });
  }

  public terminate(): void {
    this.worker.terminate();
  }
}

// Singleton instance for the app
export const cryptoService = typeof window !== "undefined" ? new CryptoService() : null;
