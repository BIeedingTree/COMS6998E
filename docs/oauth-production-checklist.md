# Say It Better — production OAuth configuration

> Configuration reference written before deployment. See [October 14 submission verification](week5-submission-checklist.md) for current live access/login results. The release-status and test-count notes below describe the original implementation, not the current deployed state. Do not reapply SQL or change working OAuth settings solely because of those historical notes.

Canonical production origin: **https://coms-6998-e.vercel.app**.

Repository inspection found no stale preview/localhost production redirects. Login uses `window.location.origin + /auth/callback`; the callback exchanges the Supabase code and uses the incoming request origin for its local return paths. Both are intentionally preserved so supported local/preview sessions stay on their own origin. Stable metadata is configured separately in `lib/site.ts` and `app/layout.tsx`, with route-specific canonical paths.

`/about` and `/privacy` are public server-rendered pages with no authentication dependency. The login page links to both, and About links to Privacy. Application data routes remain protected. Support/privacy contact: **wz2766@columbia.edu** (provided explicitly by the maintainer).

## Google Auth Platform — manual settings

| Location / field | Value |
| --- | --- |
| Branding → App name | `Say It Better` |
| Branding → User support email | `wz2766@columbia.edu` (select this account if available in the console) |
| Branding → Application home page | `https://coms-6998-e.vercel.app/about` |
| Branding → Application privacy policy link | `https://coms-6998-e.vercel.app/privacy` |
| Branding → Authorized domains | `coms-6998-e.vercel.app`; keep the existing Supabase domain authorization for `jfjkrmnglqjcadmxyryy.supabase.co` |
| Branding → Developer contact information | `wz2766@columbia.edu` |
| Audience → User type | `External` |
| Audience → Publishing status | `In production` when ready |
| Clients → Existing Web application client → Authorized JavaScript origins | `https://coms-6998-e.vercel.app` (origin only; no path) |
| Clients → Existing Web application client → Authorized redirect URIs | `https://jfjkrmnglqjcadmxyryy.supabase.co/auth/v1/callback` |
| Data Access → Sign-in scopes | `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile` |

The Supabase hostname above comes from the repository's local `NEXT_PUBLIC_SUPABASE_URL`; confirm the deployed Vercel environment uses this same project. Do not replace the working Google client or remove its Supabase callback when adding the production origin.

Google returns to **Supabase's `/auth/v1/callback`**, not the Next.js `/auth/callback`. Supabase then returns to the Next.js callback for its PKCE code exchange. Adding the app callback only in Google will not configure the Supabase allowlist.

Do **not** add `columbia.edu` or `barnard.edu` as Authorized Domains. They identify allowed account emails in application code, not domains hosting the OAuth app. External audience permits both institutions to reach the OAuth flow; the server still rejects noneligible accounts.

If Google requests ownership/brand verification or rejects an authorized-domain entry, resolve that console requirement before submission; this repository cannot establish domain ownership, console validation, or verification status. Keep the existing accepted Supabase authorization entry rather than substituting an unverified one. Publishing status and brand verification are separate settings.

## Supabase dashboard — manual settings

In Authentication → URL Configuration:

- **Site URL:** `https://coms-6998-e.vercel.app`
- **Redirect URLs:** include exactly `https://coms-6998-e.vercel.app/auth/callback`.
- Retain `http://localhost:3000/auth/callback` only if local OAuth is needed. Retain other specifically trusted development/preview callbacks only when still used; do not turn localhost or a preview hostname into the production Site URL. Avoid a broad `https://*.vercel.app/**` allowlist.

In Authentication → Sign In / Providers → Google:

- Keep Google enabled with the existing matching Google Web client ID and secret.
- Confirm the dashboard Callback URL equals `https://jfjkrmnglqjcadmxyryy.supabase.co/auth/v1/callback` and matches Google's Authorized redirect URIs.
- Review any external signup/domain restrictions to ensure both intended schools are accepted. Do not change the application eligibility checks.

No new environment variable is needed for the production website origin. Do not replace `NEXT_PUBLIC_SUPABASE_URL` with the Vercel URL: it identifies the Supabase API, not the website.

## Release checks

- Deploy the code yourself; these public routes do not exist in production until deployed. Nothing was pushed or deployed by the agent.
- Ensure Vercel Deployment Protection is OFF for the production domain. Test About and Privacy without a session in Incognito: both must return content directly, with production canonical URLs, without a sign-in wall.
- The public pages describe the private-draft model from the preceding iteration. Review/apply that iteration's `supabase/week5-drafts.sql` before releasing the corresponding app; this task does not execute or modify it.
- Test Google sign-in with actual Columbia and Barnard accounts and verify return to the stable production domain. Test invalid-domain rejection, logout, and protected-route redirects.
- Check support/contact details and the policy description against the deployed configuration, including avatar storage, AI-provider terms and data-retention practices.

Sources: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Google brand verification and public-page requirements](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

## Local validation completed

TypeScript, all 86 existing action/page tests, and the production build passed. Lint had no errors and retained the existing Profile avatar `<img>` warning. The local production server returned 200 for unauthenticated About/Privacy requests, with matching `https://coms-6998-e.vercel.app` canonical and Open Graph URLs and the provided contact email. Login links both pages. `/`, `/community`, and `/profile` still returned 307 to `/login`. Browser inspection covered desktop About and 320px Privacy without horizontal overflow. These checks do not establish that the new routes are deployed or that external dashboard settings have changed.
