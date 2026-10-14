"use client";

import { useState } from "react";
import Link from "next/link";
import { ELIGIBILITY_MESSAGE } from "@/lib/auth/eligibility";
import Brand, { BrandMark } from "@/components/Brand";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export default function LoginScreen({ reason }: { reason?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const handleGoogleLogin = async () => {
    setPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError("We couldn’t start Google sign-in. Please try again.");
      setPending(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-content">
          <span className="eyebrow">YOU HAVE THE INTENTION. WE’LL FIND THE WORDS.</span>
          <h1>Less <span className="crossed-word">overthinking.</span><br /><em>Better messages.</em></h1>
          <p>For the follow-up, the awkward ask, and the text that’s still sitting in your notes app.</p>
          <div className="login-examples">
            <div className="example-note"><span className="note-label">THE SITUATION</span><p>“Ask my professor for two more days on the assignment without sounding irresponsible.”</p></div>
            <div className="example-answer"><span className="note-label"><Icon name="spark" /> AN EXAMPLE DRAFT</span><p>Hi Professor, would it be possible to have a two-day extension on the assignment? I’d really appreciate the extra time. Thank you for considering it.</p><span className="example-caption">A clearer ask. Still your intention.</span></div>
          </div>
        </div>
        <span className="login-story-footer">YOUR WORDS, WITH A LITTLE HELP.</span>
      </section>
      <section className="login-entry">
        <div className="login-card">
          <BrandMark />
          <p className="eyebrow">LET’S FIND YOUR WORDS</p>
          <h2>Say It <em>Better.</em></h2>
          <p className="login-tagline">For texts you’ve rewritten six times already.</p>
          <p className="login-description">Your private space to find the words.<br />Share a draft only when you choose.</p>
          <p className="login-eligibility">For Columbia and Barnard students.</p>
          {(error || reason) && <p role="alert" className="inline-error">{error || (reason === "eligibility" ? ELIGIBILITY_MESSAGE : "Sign-in wasn’t completed. Please try again.")}</p>}
          <button onClick={handleGoogleLogin} disabled={pending} className="google-button">
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6ZM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 5.9Z"/></svg>
            {pending ? "Connecting…" : "Continue with Google"} <Icon name="arrow" />
          </button>
          <p className="login-footnote">Write privately. Share anonymously.<br />You decide what to send. We never send for you.</p>
          <nav className="login-public-links" aria-label="About and privacy">
            <Link href="/about">About Say It Better</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </nav>
        </div>
        <span className="login-entry-footer">A little help. A lot more like you.</span>
      </section>
    </main>
  );
}
