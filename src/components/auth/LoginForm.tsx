"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { base64ToBuffer, importKey, exportKey } from "@/lib/crypto/hybrid";
import { deriveKeyFromPassword } from "@/lib/crypto/kdf";
import { useCrypto } from "@/context/CryptoContext";

export default function LoginForm() {
  const { setKeyPair } = useCrypto();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Log in via Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Login failed");

      // 2. Fetch Profile (Keys)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) throw profileError;

      // 3. Drive Master Key from Password
      const salt = base64ToBuffer(profile.key_salt);
      const masterKey = await deriveKeyFromPassword(password, new Uint8Array(salt));

      // 4. Decrypt the Private Key
      const encryptedPrivateKey = base64ToBuffer(profile.encrypted_private_key);
      const iv = base64ToBuffer(profile.key_iv);

      try {
        const rawPrivateKey = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: new Uint8Array(iv) as BufferSource },
          masterKey,
          encryptedPrivateKey
        );

        // 5. Import the Private Key
        const privateKey = await importKey(rawPrivateKey, "private");
        const publicKey = await importKey(base64ToBuffer(profile.public_key), "public");
        
        // 6. Store in Global Context
        setKeyPair(publicKey, privateKey);
        
        alert("Login successful! Private key restored.");
      } catch (decryptError) {
        throw new Error("Failed to decrypt private key. Incorrect password?");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800">Secure Login</h2>
      <p className="text-sm text-gray-500">Access your vault with zero-knowledge security.</p>
      
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
      >
        {loading ? "Unwrapping Vault..." : "Log In"}
      </button>
    </form>
  );
}
