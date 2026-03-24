"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cryptoService } from "@/lib/crypto/crypto-service";
import { generateAESKey, generateIV, wrapKey, bufferToBase64, exportKey } from "@/lib/crypto/hybrid";
import { useCrypto } from "@/context/CryptoContext";

export default function FileUploader() {
  const { publicKey } = useCrypto();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file || !publicKey || !cryptoService) return;
    setUploading(true);
    setStatus("Encrypting...");

    try {
      // 1. Read File as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 2. Generate Session Key (AES)
      const aesKey = await generateAESKey();
      const iv = generateIV();

      // 3. Encrypt File in Worker
      const encryptedData = await cryptoService.encrypt(arrayBuffer, aesKey, iv);

      // 4. Wrap AES Key with User's RSA Public Key
      const encryptedKey = await wrapKey(aesKey, publicKey);

      // 5. Compute SHA-256 Hash for Integrity
      const hash = await cryptoService.hash(arrayBuffer);

      // 6. Upload Encrypted Blob to Supabase Storage
      const fileName = `${crypto.randomUUID()}.enc`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from("secure_files")
        .upload(fileName, encryptedData, {
          contentType: "application/octet-stream",
        });

      if (storageError) throw storageError;

      // 7. Store Metadata in 'files' table
      const { error: metaError } = await supabase.from("files").insert({
        name: file.name, // We can encrypt this later for more privacy
        storage_path: fileName,
        encrypted_key: bufferToBase64(encryptedKey),
        iv: bufferToBase64(iv.buffer as ArrayBuffer),
        integrity_hash: bufferToBase64(hash),
        owner_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (metaError) throw metaError;

      setStatus("Upload Complete!");
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Secure Upload</h3>
      
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 transition-colors cursor-pointer bg-gray-50 mb-4 group">
        <input
          type="file"
          id="file-input"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <label htmlFor="file-input" className="cursor-pointer text-center">
          <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📁</div>
          <span className="text-sm text-gray-600">
            {file ? file.name : "Select a private file to encrypt & upload"}
          </span>
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading || !publicKey}
        className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {uploading ? "Securing & Sending..." : "Encrypt and Upload"}
      </button>

      {status && (
        <p className={`mt-3 text-sm text-center ${status.includes("Error") ? "text-red-500" : "text-green-600"}`}>
          {status}
        </p>
      )}
    </div>
  );
}
