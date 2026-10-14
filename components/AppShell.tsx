import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";

export default function AppShell({ children, active }: {
  children: ReactNode;
  active: "drafts" | "community" | "profile";
}) {
  const links = [
    { key: "drafts", icon: "feed", href: "/", label: "My Drafts" },
    { key: "community", icon: "community", href: "/community", label: "Community Drafts" },
    { key: "profile", icon: "profile", href: "/profile", label: "Profile" },
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-link" aria-label="Say It Better home"><Brand /></Link>
        <div className="sidebar-body">
          <p className="nav-eyebrow eyebrow">A LITTLE HELP WITH THE WORDS</p>
          <nav aria-label="Main navigation" className="main-nav">
            {links.map(item => (
              <Link key={item.key} href={item.href} className={`nav-item nav-${item.key} ${active === item.key ? "nav-active" : ""}`} aria-current={active === item.key ? "page" : undefined}>
                <Icon name={item.icon} /><span>{item.label}</span>
                {active === item.key && <span className="nav-dot" />}
              </Link>
            ))}
            <LogoutButton />
          </nav>
          <div className="sidebar-note">
            <Icon name="spark" />
            <p>You know what<br />you mean.</p>
            <span>Let’s find a better way to say it.</span>
          </div>
          <div className="sidebar-footer"><span className="eyebrow">LESS OVERTHINKING.</span><p>Built for Columbia<br />& Barnard students.</p></div>
        </div>
      </aside>
      <main className="main-column">{children}</main>
    </div>
  );
}
