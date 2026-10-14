import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import { SUPPORT_EMAIL } from "@/lib/site";

const description = "How Say It Better handles Google sign-in information, saved drafts, AI prompts, community sharing, and ratings.";
export const metadata: Metadata = {
  title: "Privacy Policy — Say It Better",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy Policy — Say It Better", description, url: "/privacy", type: "website", siteName: "Say It Better" },
};

export default function PrivacyPage() {
  return <PublicPage active="privacy">
    <header className="page-header public-hero">
      <p className="eyebrow">YOUR WORDS. YOUR CHOICE TO SHARE.</p>
      <h1>Privacy <em>Policy.</em></h1>
      <p className="policy-date">Last updated: October 14, 2026</p>
      <p>This policy explains how Say It Better, a student course project, handles information when you sign in, generate drafts, and use Community Drafts.</p>
    </header>
    <article className="public-copy">
      <section><h2>Google sign-in and your profile</h2><p>We use Google through Supabase Auth to sign you in. Basic Google account information, including your account identifier, email address, name, and profile picture when provided, may be stored with your authentication record. We use your verified email to check Columbia or Barnard eligibility, establish your session, and associate your drafts and votes with your account.</p><p>You can also save a first name, last name, and avatar through Profile. The app does not request access to your Gmail messages, contacts, calendar, or Google Drive files, and does not send messages through your Google account.</p></section>
      <section><h2>Drafts and AI generation</h2><p>When you generate a draft, your situation and selected preferences are included in a prompt sent to Google Gemini. Supabase stores the exact generation prompt, generated body, email subject when applicable, message type, category, timestamps, publication state, and your account ID.</p><p>Google processes generation inputs under the terms that apply to the project’s Gemini service. Include only information you are comfortable submitting for AI processing. The app does not automatically add your sign-in email or profile information to the generation prompt.</p></section>
      <section><h2>Private drafts and Community sharing</h2><p>New drafts are private by default. Other app users can read a draft only after you choose to post it to Community. A community post shows its generated subject and body, type, category, date, and aggregate ratings; it does not show your account name, email, user ID, or stored prompt.</p><p>A generated message can still include personal details from your situation. Review the message before sharing it. Removing a draft from Community makes it private again but does not delete the saved draft or its historical ratings. It cannot withdraw copies another user already made.</p></section>
      <section><h2>Ratings</h2><p>We store your rating with your account ID and the draft ID so you can change or remove it and have at most one rating per draft. Community users see aggregate “Send it” and “Needs work” counts and their own selected rating, not other voters’ identities.</p></section>
      <section><h2>Service providers and technical data</h2><p>Supabase provides authentication, database storage, and avatar storage. Google provides sign-in and Gemini generation. Vercel hosts the application. These providers process information needed to operate their services, which may include request and security logs. Authentication cookies keep you signed in.</p><p>Authorized project administrators and service providers may access stored data as needed to operate and maintain the app. Profile avatars use public storage URLs; anyone with an avatar URL may be able to view the image. Community posts do not display profile avatars.</p></section>
      <section><h2>Retention and your choices</h2><p>Drafts, prompts, profiles, and ratings remain stored unless removed; the app does not currently apply an automatic deletion schedule. You can edit your profile, unpublish a shared draft, remove your own rating on a published draft, and sign out. Unpublishing and signing out do not delete your account or saved data.</p><p>For account or data-deletion requests, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the email associated with your account. The maintainer may need to verify the request. Provider backups and operational logs may follow separate retention schedules.</p></section>
      <section><h2>Contact and updates</h2><p>For privacy questions, contact the Say It Better project maintainer at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Changes to this policy will be published on this page with an updated date.</p></section>
    </article>
  </PublicPage>;
}
