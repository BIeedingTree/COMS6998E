import Link from "next/link";
import type { Metadata } from "next";
import { requireEligibleUser } from "@/lib/auth/require-user";
import AppShell from "@/components/AppShell";
import DraftTabs from "@/components/DraftTabs";
import MessageCard from "@/components/MessageCard";
import { BrandMark } from "@/components/Brand";
import { CATEGORIES, COMMUNITY_FIELDS, isCategory, type Draft, type RatingCounts } from "@/lib/drafts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/community" } };
export default async function Community({ searchParams }: { searchParams: Promise<{ category?: string | string[] }> }) {
  const { supabase, user } = await requireEligibleUser();
  const requestedCategory = (await searchParams).category;
  const category = isCategory(requestedCategory) ? requestedCategory : null;
  let query = supabase.from("captions").select(COMMUNITY_FIELDS).eq("is_public", true)
    .order("published_at", { ascending: false }).order("id", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  const drafts = (error ? [] : data ?? []) as Draft[];
  const ids = drafts.map(draft => String(draft.id));
  const [ratings, votes] = ids.length ? await Promise.all([
    supabase.rpc("get_community_rating_counts", { p_caption_ids: ids }),
    supabase.from("caption_votes").select("caption_id,vote").eq("user_id", user.id).in("caption_id", ids),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  const counts = new Map<string, RatingCounts>((ratings.data ?? []).map((row: { caption_id: string | number; positive_count: number | string; negative_count: number | string }) => [
    String(row.caption_id), { positive: Math.max(0, Number(row.positive_count)), negative: Math.max(0, Number(row.negative_count)) },
  ]));
  const selected = new Map<string, number>((votes.data ?? []).map((row: { caption_id: string | number; vote: number }) => [String(row.caption_id), row.vote]));
  return <AppShell active="community">
    <header className="page-header library-header"><p className="eyebrow">A LITTLE WISDOM, SHARED.</p><h1>Good words.<br /><em>Worth sharing.</em></h1><p className="hero-tagline">Messages Columbia & Barnard students thought were worth sharing.</p></header>
    <DraftTabs active="community" />
    <section aria-labelledby="community-heading" className="community-library">
      <header className="community-heading"><div><h2 id="community-heading">Community Drafts</h2><p>Shared anonymously. Borrow the words that work for you.</p></div></header>
      <nav aria-label="Filter by category" className="category-filters">
        <Link href="/community" aria-current={!category ? "page" : undefined}>All drafts</Link>
        {CATEGORIES.map(option => <Link key={option.value} href={`/community?category=${option.value}`} aria-current={category === option.value ? "page" : undefined}>{option.label}</Link>)}
      </nav>
      <p className="rating-hint">Ready to send, or still needs work? Rate a draft below. Click again to undo.</p>
      {error && <p role="alert" className="inline-error">Community drafts couldn’t be loaded. Please refresh to try again.</p>}
      {(ratings.error || votes.error) && <p role="alert" className="inline-error">Ratings couldn’t be loaded. Please refresh to try again.</p>}
      <div className="message-list">{drafts.map(message => <MessageCard key={message.id} message={message} mode="community" selectedVote={selected.get(String(message.id)) ?? null} counts={counts.get(String(message.id)) ?? null} votingAvailable={!ratings.error && !votes.error} />)}</div>
      {!error && !drafts.length && <div className="empty-state"><BrandMark /><h3>{category ? "Good words are on their way." : "The first good words could be yours."}</h3><p>{category ? "No shared drafts in this category yet. Try another, or share one of your own." : "Share a useful draft from your private workspace to get the library started."}</p><Link href="/" className="secondary-button">Go to My Drafts</Link></div>}
      {!!drafts.length && <p className="community-end">A little less overthinking. A little more you.</p>}
    </section>
  </AppShell>;
}
