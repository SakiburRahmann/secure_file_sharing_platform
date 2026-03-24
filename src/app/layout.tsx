import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CryptoProvider } from "@/context/CryptoContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SecureVault - Zero-Knowledge File Sharing",
  description: "Advanced cryptographic file sharing system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CryptoProvider>
          {children}
        </CryptoProvider>
      </body>
    </html>
  );
}
