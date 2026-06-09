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
        {children}
      </body>
    </html>
  );
}
