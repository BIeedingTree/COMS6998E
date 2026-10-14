import Link from "next/link";
export default function DraftTabs({ active }: { active: "drafts" | "community" }) {
  return <nav className="draft-tabs" aria-label="Draft collections">
    <Link href="/" aria-current={active === "drafts" ? "page" : undefined}>My Drafts</Link>
    <Link href="/community" aria-current={active === "community" ? "page" : undefined}>Community Drafts</Link>
  </nav>;
}
