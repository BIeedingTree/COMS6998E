import Link from "next/link";
import { requireEligibleUser } from "@/lib/auth/require-user";
import AppShell from "@/components/AppShell";
import MessageCard from "@/components/MessageCard";
import MessageComposer from "@/components/MessageComposer";
import { CATEGORIES, isCategory, originalRequest, type Draft } from "@/lib/drafts";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Home({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { supabase } = await requireEligibleUser();
  const requestedCategory = (await searchParams).category;
  const category = isCategory(requestedCategory) ? requestedCategory : null;
  const [{ data, error }, prompts] = await Promise.all([
    supabase.rpc("get_my_drafts"),
    supabase.rpc("get_my_draft_prompts"),
  ]);
  if (prompts.error) console.error("[Home] Original-request lookup failed", {
    code: prompts.error.code,
    message: prompts.error.message,
    details: prompts.error.details,
    hint: prompts.error.hint,
  });
  const requests = new Map<string, string | null>((prompts.error ? [] : prompts.data ?? []).map(
    (row: { id: string | number; prompt: string | null }) => [String(row.id), originalRequest(row.prompt)],
  ));
  const allDrafts = (error ? [] : data ?? []) as Draft[];
  const drafts = category ? allDrafts.filter(draft => draft.category === category) : allDrafts;
  return (
    <AppShell active="drafts">
      <header className="page-header"><h1>Say It Better</h1><p>Enter a prompt to generate an email or text automatically.</p></header>
      <MessageComposer filtered={Boolean(category)} />
      <section id="my-drafts" className="community-section" aria-labelledby="drafts-heading">
        <header className="collection-heading"><h2 id="drafts-heading">My Drafts</h2></header>
        <nav aria-label="Filter My Drafts by category" className="category-filters">
          <Link href="/" aria-current={!category ? "page" : undefined}>All</Link>
          {CATEGORIES.map(option => <Link key={option.value} href={`/?category=${option.value}`} aria-current={category === option.value ? "page" : undefined}>{option.label}</Link>)}
        </nav>
        {error && <p role="alert" className="inline-error">Your drafts couldn’t be loaded. Please refresh to try again.</p>}
        {prompts.error && !error && drafts.length > 0 && <p role="status" className="inline-error">Your drafts are available, but their original requests couldn’t be loaded. Please try again later.</p>}
        <div className="message-list">{drafts.map((message, index) => <MessageCard key={message.id} message={message} mode="private" originalRequest={requests.get(String(message.id)) ?? null} newest={index === 0} />)}</div>
        {!error && drafts.length === 0 && <div className="empty-state"><p>{category ? "No drafts in this category yet." : "No drafts yet. Write your first one above."}</p></div>}
      </section>
    </AppShell>
  );
}
