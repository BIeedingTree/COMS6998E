import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";
import DraftTabs from "@/components/DraftTabs";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";

export default function AppShell({ children, active }: {
  children: ReactNode;
  active: "drafts" | "community" | "profile";
}) {
  const links = [
    { key: "drafts", href: "/", label: "My Drafts", icon: "feed" },
    { key: "community", href: "/community", label: "Community Drafts", icon: "community" },
    { key: "profile", href: "/profile", label: "Profile", icon: "profile" },
  ] as const;
  return <div className={`app-shell shell-${active}`}>
    <aside className="sidebar">
      <Link href="/" className="brand-link" aria-label="Say It Better home"><Brand /></Link>
      <nav aria-label="Main navigation" className="main-nav">
        {links.map(item => <Link key={item.key} href={item.href} className={`nav-item nav-${item.key}`} aria-current={active === item.key ? "page" : undefined}>
          <Icon name={item.icon} /><span>{item.label}</span>
          {active === item.key && <span className="nav-dot" aria-hidden="true" />}
        </Link>)}
        <LogoutButton />
      </nav>
    </aside>
    <main className="main-column">
      <DraftTabs active={active} />
      {children}
    </main>
  </div>;
}
