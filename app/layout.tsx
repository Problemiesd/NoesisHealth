import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoesisHealth",
  description: "Chat-first health logging with deterministic parsing and optional AI."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div>
              <p className="eyebrow">NoesisHealth</p>
              <h1>Chat-first health logging</h1>
              <p className="subtle">
                Logs are deterministic. OpenAI only runs when you turn it on.
              </p>
              <p className="subtle small">
                AI plan file: <strong>AI_PLAN.md</strong>
              </p>
            </div>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
