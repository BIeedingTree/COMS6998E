import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";

export default function PublicPage({ active, children }: {
  active: "about" | "privacy";
  children: ReactNode;
}) {
  return <div className="public-page">
    <header className="public-header">
      <Link href="/about" aria-label="About Say It Better"><Brand /></Link>
      <nav aria-label="Public navigation">
        <Link href="/about" aria-current={active === "about" ? "page" : undefined}>About</Link>
        <Link href="/privacy" aria-current={active === "privacy" ? "page" : undefined}>Privacy</Link>
        <Link href="/login" className="secondary-button">Sign in</Link>
      </nav>
    </header>
    <main id="main-content" className="public-content">{children}</main>
  </div>;
}
