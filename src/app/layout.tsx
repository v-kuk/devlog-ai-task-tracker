import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevLog — AI-powered dev task tracker",
  description: "Track tasks, decompose work with AI agents, unblock stuck items.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen antialiased"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {children}
      </body>
    </html>
  );
}
