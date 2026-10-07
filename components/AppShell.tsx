import Link from "next/link";
import type { ReactNode } from "react";
import Brand from "@/components/Brand";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";

export default function AppShell({ children, active, email }: { children: ReactNode; active: "feed" | "members" | "profile"; email?: string }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand-link" aria-label="Campus Feed home"><Brand /></Link>
      <div className="sidebar-body">
        <p className="eyebrow nav-eyebrow">YOUR LITTLE CORNER OF THE INTERNET</p>
        <nav aria-label="Main navigation" className="main-nav">
          {([{ key: "feed", href: "/", label: "Feed" }, { key: "members", href: "/members", label: "Members" }, { key: "profile", href: "/profile", label: "Profile" }] as const).map(item =>
            <Link key={item.key} href={item.href} className={`nav-item ${active === item.key ? "nav-active" : ""}`} aria-current={active === item.key ? "page" : undefined}><Icon name={item.key} /><span>{item.label}</span>{active === item.key && <span className="nav-dot" />}</Link>
          )}
          <LogoutButton />
        </nav>
        <div className="sidebar-note"><span className="tiny-star">✳</span><p>Campus life.<br />A little less serious.</p><span>AI writes it. You call it.</span></div>
        <div className="sidebar-footer">{email && <p className="account-email" title={email}>{email}</p>}<p>Made for the campus group chat.</p><span>Columbia · New York City</span></div>
      </div>
    </aside>
    <main className="main-column">{children}</main>
    <aside className="context-column" aria-label="About Campus Feed">
      <div className="location-label"><span className="status-dot" /> CAMPUS CULTURE, NYC EDITION</div>
      <section className="context-card"><span className="eyebrow">THE IDEA</span><h2>Very campus.<br />Very online.</h2><p>A timeline for the things everyone is thinking. Pick a topic, let AI take a shot, and tell us if it lands.</p><div className="context-rule"/><span className="mini-label"><Icon name="spark" /> Every post is AI-generated</span></section>
      <section className="topic-note"><span className="eyebrow">MATERIAL IS EVERYWHERE</span><h3>Sound familiar?</h3>{["The Butler night shift", "Dining hall roulette", "The unpaid internship arc", "A very local subway delay"].map((topic, i) => <div className="topic-line" key={topic}><span>0{i + 1}</span>{topic}</div>)}</section>
      <p className="context-footer">Artificial intelligence.<br />Real campus energy.</p>
    </aside>
  </div>;
}
