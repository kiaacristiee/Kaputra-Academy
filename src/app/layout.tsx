import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/layout/AuthProvider";

import FloatingChatbot from "@/components/FloatingChatbot";

export const metadata: Metadata = {
  title: "Kaputra Academy",
  description: "Knowledge is Power",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <FloatingChatbot />
      </body>
    </html>
  );
}