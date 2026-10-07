"use client";

import Brand, { FeedMark } from "@/components/Brand";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-content"><span className="eyebrow">AI-GENERATED CAMPUS DISCOURSE</span><h1>For the plot. <br />For the campus.<br /><em>For the feed.</em></h1><p>From late nights in Butler to questionable dining hall decisions. Your campus has material.</p><div className="login-art" aria-hidden="true"><span className="art-orbit" /><span className="art-orbit orbit-two" /><span className="art-mark"><FeedMark /></span><span className="art-label label-one">campus life</span><span className="art-label label-two">internet energy</span><span className="art-star">✳</span></div></div>
        <span className="login-story-footer">COLUMBIA ENERGY. NEW YORK STATE OF MIND.</span>
      </section>
      <section className="login-entry">
        <div className="login-card"><span className="entry-mark"><FeedMark /></span><p className="eyebrow">YOUR TIMELINE STARTS HERE</p><h2>Welcome to <br />Campus Feed<span className="brand-dot">.</span></h2><p>AI makes the posts.<br />You decide what lands.</p><button onClick={handleGoogleLogin} className="google-button"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6ZM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 5.9Z"/></svg>Continue with Google<Icon name="arrow" /></button><p className="login-private">A campus corner for signed-in people.<br />Sign in to explore, generate, and react.</p></div>
        <span className="login-entry-footer">A little artificial. Very relatable.</span>
      </section>
    </main>
  );
}
