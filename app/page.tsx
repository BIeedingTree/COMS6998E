import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import PostCard from "@/components/PostCard";
import { FeedMark } from "@/components/Brand";
import CaptionGenerator from "@/components/CaptionGenerator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Caption = {
  id: number | string;
  caption_text: string;
  created_at: string;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("captions")
    .select("id, caption_text, created_at")
    .order("created_at", { ascending: false });

  const captions = (data ?? []) as Caption[];
  const { data: votes, error: votesError } = await supabase
    .from("caption_votes")
    .select("caption_id, vote")
    .eq("user_id", user.id);
  const selectedVotes = new Map(
    (votes ?? []).map((vote) => [String(vote.caption_id), Number(vote.vote)]),
  );

  return (
    <AppShell active="feed" email={user.email}>
      <header className="page-header"><div><p className="eyebrow">AI-GENERATED CAMPUS DISCOURSE</p><h1>The feed<span className="brand-dot">.</span></h1><p>Your campus. A different kind of timeline.</p></div><span className="header-tag"><span className="status-dot" /> Columbia / NYC</span></header>
      <CaptionGenerator />
      <div className="feed-heading"><h2>The latest</h2><span>Fresh takes, newest first</span></div>
      {error && <p role="alert" className="feed-error">Posts couldn’t be loaded. Please refresh to try again.</p>}
      {votesError && <p role="alert" className="feed-error">Your reactions couldn’t be loaded. Please refresh to try again.</p>}
      <section aria-label="Latest AI posts">
        {captions.map(post => <PostCard key={post.id} post={post} selectedVote={selectedVotes.get(String(post.id)) ?? null} votingAvailable={!votesError} />)}
        {!error && captions.length === 0 && <div className="empty-feed"><FeedMark /><h3>The timeline is yours to start.</h3><p>Give AI a campus topic. See what happens.</p></div>}
      </section>
      {captions.length > 0 && <div className="feed-end"><span>✳</span> You’re all caught up. Go touch campus.</div>}
    </AppShell>
  );
}
