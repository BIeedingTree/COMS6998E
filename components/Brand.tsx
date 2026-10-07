export function FeedMark({ small = false }: { small?: boolean }) {
  return <span className={`feed-mark ${small ? "feed-mark-small" : ""}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14v10H9l-4 4V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></span>;
}

export default function Brand() {
  return <span className="brand"><FeedMark /><span>campus<span className="brand-light">feed</span><span className="brand-dot">.</span></span></span>;
}
