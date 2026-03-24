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

      // 4. Sign up User via Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      // 5. Store Public Key and Encrypted Private Key in 'profiles' table
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        public_key: bufferToBase64(await exportKey(publicKey)),
        encrypted_private_key: bufferToBase64(encryptedPrivateKey),
        key_iv: bufferToBase64(iv.buffer as ArrayBuffer),
        key_salt: bufferToBase64(salt.buffer as ArrayBuffer),
      });

      if (profileError) throw profileError;

      alert("Signup successful! Please confirm your email.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4 max-w-sm mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
      <p className="text-sm text-gray-500">Secure "Zero-Knowledge" registration starts here.</p>
      
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
        {loading ? "Securing Keys..." : "Sign Up"}
      </button>
    </form>
  );
}
