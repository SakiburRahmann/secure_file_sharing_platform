"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCrypto } from "@/context/CryptoContext";
import SignupForm from "@/components/auth/SignupForm";
import LoginForm from "@/components/auth/LoginForm";
import FileUploader from "@/components/files/FileUploader";
import FileList from "@/components/files/FileList";

export default function Home() {
  const { isUnlocked } = useCrypto();
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<"login" | "signup">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">SecureVault</h1>
            <p className="mt-2 text-gray-600">Secure File Sharing with Client-Side Encryption</p>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
            <button
              onClick={() => setView("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                view === "login" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setView("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all ${
                view === "signup" ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          {view === "login" ? <LoginForm /> : <SignupForm />}
        </div>
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="p-12 bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900">Vault Locked</h2>
            <p className="text-gray-500 mt-2 mb-8">
              Your session is active, but your private key is not unwrapped. 
              Please re-login to access your encrypted files.
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-6 py-2 bg-red-50 text-red-600 font-medium rounded-full hover:bg-red-100 transition-colors"
            >
              Sign Out & Re-login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-xl font-bold text-gray-800">SecureVault</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> End-to-End Encryption Enabled
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-500">Manage your encrypted files and secure sharing.</p>
          </div>
          <FileUploader />
        </section>

        <hr className="border-gray-100" />

        <section>
          <FileList />
        </section>
      </div>

      <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-xs text-uppercase tracking-widest">
        &copy; 2026 SECUREVAULT - SECURE CLOUD STORAGE
      </footer>
    </main>
  );
}
