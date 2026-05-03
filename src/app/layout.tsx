import type { Metadata } from "next";
import "./globals.css";
import { auth } from "@/lib/auth";
import Navbar from "@/components/navbar";

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
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@preline/preline@2.0.0/dist/preline.min.css" />
      </head>
      <body className="antialiased bg-gray-50">
        <Navbar user={session?.user} />
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
        <script src="https://cdn.jsdelivr.net/npm/@preline/preline@2.0.0/dist/preline.min.js" async />
      </body>
    </html>
  );
}
