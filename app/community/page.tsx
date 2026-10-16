import Link from "next/link";
import type { Metadata } from "next";
import { requireEligibleUser } from "@/lib/auth/require-user";
import AppShell from "@/components/AppShell";
import MessageCard from "@/components/MessageCard";
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
  const [ratings, votes, requests] = ids.length ? await Promise.all([
    supabase.rpc("get_community_rating_counts", { p_caption_ids: ids }),
    supabase.from("caption_votes").select("caption_id,vote").eq("user_id", user.id).in("caption_id", ids),
    supabase.rpc("get_community_requests", { p_caption_ids: ids }),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (requests.error) console.error("[Community] Original-request lookup failed", {
    code: requests.error.code,
    message: requests.error.message,
    details: requests.error.details,
    hint: requests.error.hint,
  });
  const originalRequests = new Map<string, string>((requests.error ? [] : requests.data ?? []).map(
    (row: { id: string | number; original_request: string }) => [String(row.id), row.original_request],
  ));
  const counts = new Map<string, RatingCounts>((ratings.data ?? []).map((row: { caption_id: string | number; positive_count: number | string; negative_count: number | string }) => [
    String(row.caption_id), { positive: Math.max(0, Number(row.positive_count)), negative: Math.max(0, Number(row.negative_count)) },
  ]));
  const selected = new Map<string, number>((votes.data ?? []).map((row: { caption_id: string | number; vote: number }) => [String(row.caption_id), row.vote]));
  return <AppShell active="community">
    <header className="page-header"><h1 id="community-heading">Community Drafts</h1><p>Drafts generated for other Columbia students. Vote to send or rewrite.</p></header>
    <section aria-labelledby="community-heading" className="community-library">
      <nav aria-label="Filter by category" className="category-filters">
        <Link href="/community" aria-current={!category ? "page" : undefined}>All</Link>
        {CATEGORIES.map(option => <Link key={option.value} href={`/community?category=${option.value}`} aria-current={category === option.value ? "page" : undefined}>{option.label}</Link>)}
      </nav>
      {error && <p role="alert" className="inline-error">Community drafts couldn’t be loaded. Please refresh to try again.</p>}
      {(ratings.error || votes.error) && <p role="alert" className="inline-error">Ratings couldn’t be loaded. Please refresh to try again.</p>}
      {requests.error && <p role="status" className="inline-error">Original requests couldn’t be loaded. Drafts and ratings are still available.</p>}
      <div className="message-list">{drafts.map(message => <MessageCard key={message.id} message={message} mode="community" originalRequest={originalRequests.get(String(message.id)) ?? null} selectedVote={selected.get(String(message.id)) ?? null} counts={counts.get(String(message.id)) ?? null} votingAvailable={!ratings.error && !votes.error} />)}</div>
      {!error && !drafts.length && <div className="empty-state"><p>{category ? "No drafts in this category yet." : "No shared drafts yet."}</p><Link href="/" className="text-link">Go to My Drafts</Link></div>}
    </section>
  </AppShell>;
}
