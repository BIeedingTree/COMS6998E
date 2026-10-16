import type { Metadata } from "next";
import Link from "next/link";
import PublicPage from "@/components/PublicPage";
import { SUPPORT_EMAIL } from "@/lib/site";

const description = "Say It Better is an AI writing assistant for Columbia and Barnard students, with private saved drafts and an optional anonymous community library.";
export const metadata: Metadata = {
  title: "About — Say It Better",
  description,
  alternates: { canonical: "/about" },
  openGraph: { title: "About Say It Better", description, url: "/about", type: "website", siteName: "Say It Better" },
};

export default function AboutPage() {
  return <PublicPage active="about">
    <header className="page-header public-hero">
      <h1>About Say It Better</h1>
      <p>Say It Better helps Columbia and Barnard students turn a difficult ask, an awkward follow-up, or a half-written email into a message they can actually use.</p>
      <Link href="/login" className="primary-button">Sign in</Link>
    </header>
    <article className="public-copy">
      <section><h2>Your own space to draft</h2><p>Describe the situation, choose an email or message, and set the tone. Google Gemini generates a draft that saves to My Drafts. Emails include a subject and body, ready to copy. You review, edit wherever you send it, and decide what to send; Say It Better never sends messages for you.</p></section>
      <section><h2>Share only when you choose</h2><p>Drafts are private by default. If a message could help someone else, you can explicitly post it to Community Drafts. The sharing confirmation covers both the generated message and your original request. Your account identity and the full AI instructions remain hidden. Other signed-in students can rate it “Send it” or “Needs work.” You can remove it from Community while keeping your saved draft.</p></section>
      <section><h2>Made for campus conversations</h2><p>Start with an extension request, a recruiter follow-up, a roommate conversation, or a club introduction. Academic, Career, Clubs, Housing, Social, and Other categories keep useful examples easy to find.</p></section>
      <section><h2>Sign in with your school account</h2><p>Google sign-in is available to verified Columbia and Barnard email accounts. We use basic account information to authenticate you and keep your drafts and ratings associated with your account. The app does not request access to Gmail, contacts, calendars, or Google Drive.</p><p>Say It Better is a student course project, not an official Columbia University or Barnard College service. Learn how account information and drafts are handled in our <Link href="/privacy">Privacy Policy</Link>.</p></section>
      <section><h2>Questions or feedback?</h2><p>Contact the project maintainer at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p></section>
    </article>
  </PublicPage>;
}
