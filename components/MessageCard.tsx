import CaptionVotes from "@/components/CaptionVotes";
import CopyButton from "@/components/CopyButton";
import PublishControl from "@/components/PublishControl";
import { CATEGORIES, MESSAGE_TYPES, draftCopyText, type Draft, type RatingCounts } from "@/lib/drafts";

type Props = { message: Draft; newest?: boolean } & (
  { mode: "private" } | { mode: "community"; selectedVote: number | null; counts: RatingCounts | null; votingAvailable: boolean }
);
export default function MessageCard(props: Props) {
  const { message, newest = false, mode } = props;
  const rawDate = mode === "community" ? message.published_at : message.created_at;
  const date = rawDate ? new Date(rawDate) : null;
  const timestamp = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(date) : null;
  return (
    <article id={`draft-${message.id}`} tabIndex={-1} aria-label="AI draft" className={`message-card ${newest ? "message-newest" : ""}`}>
      <header className="message-header">
        <div className="draft-tags"><span className="draft-type">{MESSAGE_TYPES.find(t => t.value === message.message_type)?.label ?? "Text / Message"}</span>
          <span className="category-tag">{CATEGORIES.find(c => c.value === message.category)?.label ?? "Other"}</span></div>
        <div className="message-meta">{mode === "private" && <span className={message.is_public ? "shared-label" : "private-label"}>{message.is_public ? "Shared" : "Only you"}</span>}{timestamp && <time dateTime={date!.toISOString()}>{timestamp}</time>}</div>
      </header>
      {message.message_type === "email" && message.subject && <div className="email-subject"><span className="eyebrow">SUBJECT</span><h3>{message.subject}</h3></div>}
      <p className="message-text">{message.caption_text}</p>
      <footer className={`message-actions ${mode === "private" ? "private-actions" : ""}`}>
        <CopyButton text={draftCopyText(message)} />
        {mode === "private" ? <PublishControl captionId={String(message.id)} isPublic={message.is_public} /> : props.votingAvailable && props.counts
          ? <CaptionVotes captionId={String(message.id)} selectedVote={props.selectedVote} counts={props.counts} />
          : <span className="ratings-unavailable">Ratings temporarily unavailable</span>}
      </footer>
    </article>
  );
}
