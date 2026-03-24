"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { base64ToBuffer, unwrapKey, wrapKey, bufferToBase64, importKey } from "@/lib/crypto/hybrid";
import { useCrypto } from "@/context/CryptoContext";

interface ShareProps {
  fileId: string;
  encryptedKey: string;
}

export default function ShareFile({ fileId, encryptedKey }: ShareProps) {
  const { privateKey } = useCrypto();
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleShare = async () => {
    if (!email || !privateKey) return;
    setSharing(true);
    setStatus("Preparing keys...");

    try {
      // 1. Fetch Recipient's Public Key
      const { data: recipientProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, public_key")
        .eq("id", (await supabase.from("profiles").select("id").eq("email_placeholder", email).single()).data?.id) // Mock logic, ideally search by email
        .single();
      
      // Real flow: Search by email in a public profiles view or similar
      const { data: userData, error: userError } = await supabase.rpc("get_user_by_email", { email_input: email });
      if (userError || !userData?.[0]) throw new Error("User not found");
      
      const recipientId = userData[0].id;
      const { data: profile, error: pError } = await supabase
        .from("profiles")
        .select("public_key")
        .eq("id", recipientId)
        .single();

      if (pError) throw pError;

      // 2. Unwrap File's Session Key (AES) using OWN Private Key
      const aesKey = await unwrapKey(base64ToBuffer(encryptedKey), privateKey);

      // 3. Re-wrap File's Session Key (AES) using RECIPIENT'S Public Key
      const recipientPublicKey = await importKey(base64ToBuffer(profile.public_key), "public");
      const wrappedKeyForRecipient = await wrapKey(aesKey, recipientPublicKey);

      // 4. Store in shared_keys table
      const { error: shareError } = await supabase.from("shared_keys").insert({
        file_id: fileId,
        recipient_id: recipientId,
        encrypted_key: bufferToBase64(wrappedKeyForRecipient),
      });

      if (shareError) throw shareError;

      setStatus("File shared successfully!");
      setEmail("");
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Share File</h4>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Recipient email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 text-sm p-2 border border-gray-200 rounded-md outline-none focus:border-blue-400"
        />
        <button
          onClick={handleShare}
          disabled={sharing || !email}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {sharing ? "Sharing..." : "Share"}
        </button>
      </div>
      {status && <p className="mt-2 text-xs text-blue-600">{status}</p>}
    </div>
  );
}
