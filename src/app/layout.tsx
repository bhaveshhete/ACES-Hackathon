import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LendMatch — P2P Micro-Lending Matchmaker",
  description:
    "A decision-support tool that helps investors find and evaluate micro-lending opportunities. Phase 1 uses synthetic data and demo assumptions. Not a licensed financial adviser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased" style={{ backgroundColor: "var(--surface-0)", color: "var(--text-primary)" }}>
        {children}
      </body>
    </html>
  );
}
