"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cryptoService } from "@/lib/crypto/crypto-service";
import { base64ToBuffer, unwrapKey } from "@/lib/crypto/hybrid";
import { useCrypto } from "@/context/CryptoContext";
import ShareFile from "./ShareFile";
import { motion, AnimatePresence } from "framer-motion";

interface FileMeta {
  id: string;
  name: string;
  storage_path: string;
  encrypted_key: string;
  iv: string;
  integrity_hash: string;
}

export default function FileList() {
  const { privateKey } = useCrypto();
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setFiles(data || []);
    setLoading(false);
  };

  const handleDownload = async (file: FileMeta) => {
    if (!privateKey || !cryptoService) return;
    setDownloading(file.id);

    try {
      const { data: blob, error: storageError } = await supabase.storage
        .from("secure_files")
        .download(file.storage_path);

      if (storageError) throw storageError;

      const encryptedData = await blob.arrayBuffer();
      const encryptedAesKey = base64ToBuffer(file.encrypted_key);
      const aesKey = await unwrapKey(encryptedAesKey, privateKey);
      const iv = base64ToBuffer(file.iv);
      const decryptedData = await cryptoService.decrypt(encryptedData, aesKey, new Uint8Array(iv));

      const actualHash = await cryptoService.hash(decryptedData);
      if (bufferToHex(actualHash) !== bufferToHex(base64ToBuffer(file.integrity_hash))) {
        throw new Error("Integrity check failed! File may have been tampered with.");
      }

      const url = window.URL.createObjectURL(new Blob([decryptedData]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error(err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const bufferToHex = (buffer: ArrayBuffer) => {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading vault...</div>;

  return (
    <div className="space-y-4 max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-2xl font-bold text-gray-900">Your Secure Vault</h3>
        <button onClick={fetchFiles} className="text-xs text-blue-500 hover:underline">Refresh</button>
      </div>

      <AnimatePresence>
        {files.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500 py-12 bg-white rounded-3xl border border-dashed border-gray-200"
          >
            No files found. Start uploading to secure your data.
          </motion.p>
        ) : (
          files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
                    📄
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400 font-mono">AES-GCM-256 Verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSharingId(sharingId === file.id ? null : file.id)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={!!downloading}
                    className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    {downloading === file.id ? "Decrypting..." : "Download"}
                  </button>
                </div>
              </div>

              {sharingId === file.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 border-t border-gray-50"
                >
                  <ShareFile fileId={file.id} encryptedKey={file.encrypted_key} />
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
