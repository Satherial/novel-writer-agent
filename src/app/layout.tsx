import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import AppShell from "@/components/app-shell";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "NovelCraft AI",
  description: "AI-powered novel writing assistant",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="it">
      <body className="antialiased bg-gray-50">
        <SessionProvider session={session}>
          <AppShell user={session?.user ?? null}>
            {children}
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
