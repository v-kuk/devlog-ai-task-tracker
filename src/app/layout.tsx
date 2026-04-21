import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevLog",
  description: "AI-powered developer task tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen" style={{ background: "var(--background)" }}>
        {children}
      </body>
    </html>
  );
}
