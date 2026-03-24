"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface CryptoContextType {
  privateKey: CryptoKey | null;
  publicKey: CryptoKey | null;
  setKeyPair: (publicK: CryptoKey | null, privateK: CryptoKey | null) => void;
  isUnlocked: boolean;
}

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);

  const setKeyPair = (publicK: CryptoKey | null, privateK: CryptoKey | null) => {
    setPublicKey(publicK);
    setPrivateKey(privateK);
  };

  return (
    <CryptoContext.Provider
      value={{
        privateKey,
        publicKey,
        setKeyPair,
        isUnlocked: !!privateKey,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error("useCrypto must be used within a CryptoProvider");
  }
  return context;
}
