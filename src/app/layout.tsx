import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovelCraft AI",
  description: "AI-powered novel writing assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
