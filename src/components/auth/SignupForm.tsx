"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateRSAKeyPair, exportKey, bufferToBase64 } from "@/lib/crypto/hybrid";
import { deriveKeyFromPassword, generateSalt } from "@/lib/crypto/kdf";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Generate RSA Key Pair
      const { publicKey, privateKey } = await generateRSAKeyPair();

      // 2. Derive Master Key for Private Key Encryption
      const salt = generateSalt();
      const masterKey = await deriveKeyFromPassword(password, salt);

      // 3. Encrypt the Private Key using the Master Key
      const rawPrivateKey = await exportKey(privateKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedPrivateKey = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        masterKey,
        rawPrivateKey
      );

      const pubK = bufferToBase64(await exportKey(publicKey));
      const encPrivK = bufferToBase64(encryptedPrivateKey);
      const ivStr = bufferToBase64(iv.buffer as ArrayBuffer);
      const saltStr = bufferToBase64(salt.buffer as ArrayBuffer);

      // 4. Sign up User via Supabase with Metadata
      // This metadata is picked up by a database trigger to create the 'profiles' row atomically
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: {
            public_key: pubK,
            encrypted_private_key: encPrivK,
            key_iv: ivStr,
            key_salt: saltStr,
          }
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      alert("Signup successful! Please confirm your email.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-900">
      <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
      <p className="text-sm text-gray-600 font-medium">Secure cryptographic registration.</p>
      
      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-bold">{error}</div>}

      <div>
        <label className="block text-sm font-bold text-gray-800">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 outline-none !text-black font-bold placeholder:text-gray-400"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-800">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 bg-gray-50 outline-none !text-black font-bold placeholder:text-gray-400"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
      >
        {loading ? "Processing..." : "Sign Up"}
      </button>
    </form>
  );
}
