import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell active="members" email={user.email}>
      <header className="page-header"><div><p className="eyebrow">IN GOOD COMPANY</p><h1>Members<span className="brand-dot">.</span></h1><p>A little corner of campus, just for us.</p></div></header>
      <section className="utility-card"><span className="utility-icon"><Icon name="members" /></span><span className="eyebrow">YOU’RE IN</span><h2>Welcome to the campus corner.</h2><p>This space is for signed-in members. You’re all set to create an AI post and weigh in on the timeline.</p><Link href="/" className="primary-button">Back to the feed <Icon name="arrow" /></Link></section>
    </AppShell>
  );
}
