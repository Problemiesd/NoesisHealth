import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoesisHealth",
  description: "Deterministic health, diet, sleep, and supplement logging."
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/log", label: "Quick Log" },
  { href: "/settings", label: "Settings" }
];

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
              <h1>Rule-first health logging</h1>
              <p className="subtle">
                Deterministic v0 with optional AI preparation disabled by default.
              </p>
            </div>
            <nav className="nav">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
