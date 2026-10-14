import { requireEligibleUser } from "@/lib/auth/require-user";
import AppShell from "@/components/AppShell";
import MessageCard from "@/components/MessageCard";
import DraftTabs from "@/components/DraftTabs";
import { BrandMark } from "@/components/Brand";
import MessageComposer from "@/components/MessageComposer";
import type { Draft } from "@/lib/drafts";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Home() {
  const { supabase } = await requireEligibleUser();
  const { data, error } = await supabase.rpc("get_my_drafts");
  const drafts = (error ? [] : data ?? []) as Draft[];
  return (
    <AppShell active="drafts">
      <header className="page-header home-header">
        <p className="eyebrow">GOOD INTENTIONS. BETTER WORDS.</p>
        <h1>Say It <em>Better.</em></h1>
        <p className="hero-tagline">For texts you’ve rewritten six times already.</p>
        <p className="hero-description">Your own space to find the words. Built for Columbia & Barnard students.</p>
      </header>
      <DraftTabs active="drafts" />
      <MessageComposer />
      <section id="my-drafts" className="community-section" aria-labelledby="drafts-heading">
        <header className="community-heading"><div><h2 id="drafts-heading">My Drafts</h2><p>Drafts are private until you choose to share them.</p></div><span className="community-order">Newest first</span></header>
        {error && <p role="alert" className="inline-error">Your drafts couldn’t be loaded. Please refresh to try again.</p>}
        <div className="message-list">{drafts.map((message, index) => <MessageCard key={message.id} message={message} mode="private" newest={index === 0} />)}</div>
        {!error && drafts.length === 0 && <div className="empty-state"><BrandMark /><h3>You don’t have any drafts yet.</h3><p>Describe what you need to say and we’ll help you find the words.</p></div>}
      </section>
    </AppShell>
  );
}
