"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/log", label: "Quick Log" },
  { href: "/settings", label: "Settings" }
];

export function AppFrame({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="stack">
      <div className="row">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} className="pill">
            {item.label}
          </Link>
        ))}
      </div>
      <header className="panel">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </header>
      {children}
    </section>
  );
}
