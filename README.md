# Say It Better

For texts you’ve rewritten six times already. A private AI writing assistant for Columbia and Barnard students, with an optional anonymous community library.

## Current workflow

- **My Drafts (`/`)** is the default workspace. Generate an email, text/message, or other draft with Gemini; it saves privately and remains here after publishing. Copy emails with their subject and body. No voting in this workspace.
- **Community Drafts (`/community`)** contains only owner-published drafts. Filter Academic, Career, Clubs, Housing, Social, or Other. Authors and original prompts are never displayed.
- **Post to Community** asks for confirmation. **Remove from Community** makes the same row private again; the draft and historical votes remain saved.
- Community ratings use `1` (Send it) and `-1` (Needs work). Click the selected rating again to remove it. Selection and aggregate counts update optimistically and roll back on error.
- Nineteen campus-oriented quick starts fill in the situation, category, message type, and recipient. Recipient and tone remain prompt-only preferences.
- Google OAuth, confirmed Columbia/Barnard email checks, Profile, avatar uploads, and logout are preserved. The old Members route is removed.

## Local setup

Install dependencies with `npm install`, configure `.env.local` from `.env.example`, then run `npm run dev`. Keep `GEMINI_API_KEY` server-only. This iteration retains the existing Gemini model and credentials.

**Database prerequisite:** review [supabase/week5-drafts.sql](supabase/week5-drafts.sql) before manually applying it to the existing Week 4 schema. It has NOT been executed. The new code requires its columns and RPCs; until it is applied, draft loading/generation will report errors. There is deliberately no fallback to the old shared feed. Do not rerun Week 4 policies after Week 5: they would restore the older broad read access.

The migration adds five caption fields, private-by-default RLS, owner-only publication permissions, published-only vote rules including own-vote DELETE, and three narrowly scoped functions. It changes only captions/votes and their supporting functions/indexes/sequence privileges. It preserves profiles, storage policies, triggers, users and all data. Full explanation: [Week 5 audit](docs/week5-audit.md).

**Do not run `supabase/remove-legacy-drafts.sql`.** That older cleanup proposal is superseded; this iteration intentionally retains legacy records. Ownerless private rows stay out of both feeds.

## Verification

```sh
node --test tests/week5.test.cjs
npx tsc --noEmit
npm run lint
npm run build
```

Automated action/page tests mock Supabase and Gemini. They do not establish live RLS behavior. See the audit for the two-account database/privacy test matrix, actual checks performed, and remaining submission work.

Before submission, manually verify real Columbia and Barnard OAuth accounts, Profile/avatar behavior, Gemini output, all private/published transitions and persistent ratings. Google OAuth audience/organization restrictions are external to the repository. No external provider settings have been changed.

Deploy only when ready, ensure Vercel Deployment Protection is OFF, test the deployment in Incognito, and submit the commit-specific deployment URL. No push or deployment was performed for this iteration.

## Production domain and public OAuth pages

The canonical website is **https://coms-6998-e.vercel.app**. `/about` and `/privacy` are public and linked from login; application data still requires authentication. Public metadata resolves against this stable origin, while OAuth redirects intentionally retain the current browser/request origin.

See [the production OAuth checklist](docs/oauth-production-checklist.md) for the exact Google Auth Platform and Supabase dashboard values, including the separate Supabase provider callback and application callback. No external configuration, database change, push or deployment is performed by these code changes.
