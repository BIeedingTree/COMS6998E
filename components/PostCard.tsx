import { FeedMark } from "@/components/Brand";
import CaptionVotes from "@/components/CaptionVotes";

export type FeedPost = { id: string | number; caption_text: string; created_at: string | null };

export default function PostCard({ post, selectedVote, votingAvailable = true }: { post: FeedPost; selectedVote: number | null; votingAvailable?: boolean }) {
  const date = post.created_at ? new Date(post.created_at) : null;
  const timestamp = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(date) : null;
  return <article className="feed-post">
    <FeedMark small />
    <div className="post-content">
      <div className="post-byline"><strong>Campus AI</strong><span className="ai-badge">AI</span><span className="post-handle">@campusfeed</span>{timestamp && <><span className="byline-dot">·</span><time dateTime={date!.toISOString()} title={date!.toISOString()}>{timestamp}</time></>}</div>
      <p className="post-text">{post.caption_text}</p>
      {votingAvailable && <CaptionVotes captionId={String(post.id)} selectedVote={selectedVote} />}
    </div>
  </article>;
}
