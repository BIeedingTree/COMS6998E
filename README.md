# Columbia Caption Generator

Week 4 adds a small AI caption generator and persistent thumbs-up/down voting to the existing Next.js App Router application. It reuses the Week 3 Google OAuth login, Supabase clients, callback, logout, and profile pages.

## Setup

1. Run `npm install`.
2. Keep the existing values in `.env.local`. Use `.env.example` as a reference; do not overwrite your current file.
3. Add `GEMINI_API_KEY=your-key` to `.env.local`. Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Never use a `NEXT_PUBLIC_` prefix for this key.
4. Complete the SQL setup below.
5. Run `npm run dev`, sign in with Google, and open `/`.

Required variables locally and in Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-existing-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-existing-publishable-or-anon-key
GEMINI_API_KEY=your-server-only-key
```

Generation runs in `app/actions.ts` through the official `@google/genai` SDK using `gemini-3.5-flash-lite`. Model availability/quota must be verified with your Gemini project. No Gemini key is currently configured in this checkout. The exact `contents` string sent to Gemini is saved as `captions.prompt`; the caption and authenticated user ID are inserted in the same row. `created_at` is supplied by the database. Failed generation or persistence returns a readable error and never reports success.

## Supabase SQL: run manually

No remote database changes have been applied. There is no existing Supabase CLI migration configuration in this repository.

1. Open **your app's Supabase project > SQL Editor**.
2. Paste and run **`supabase/inspect.sql`**. This only reads schema metadata. Review columns/defaults, existing policies, signup triggers, buckets, and any extra schemas, views, or security-definer functions.
3. Paste and run the **entire `supabase/week4.sql` file**. It runs in a transaction and is rerunnable. It never drops tables, deletes rows, or removes existing policies.
4. Re-run `inspect.sql` to verify RLS and policies. All public application tables should have RLS enabled.

Your live inspection confirmed `captions.id` is a bigint identity, with `caption_text` and `created_at`; `profiles` contains UUID `id`, names, avatar URL, and `created_at`. The only existing public policy is `"Allow public read access to captions"`. This script targets that confirmed schema, with `caption_votes` added for Week 4.

### What the script changes

- **Captions:** adds nullable `prompt` and `user_id` referencing `auth.users`. Existing rows and timestamp defaults are preserved. Alters the existing named read policy to authenticated-only, revokes anonymous access, and grants authenticated users SELECT on feed columns and INSERT on caption/prompt/user fields. Insert RLS requires `user_id = auth.uid()`. No client update/delete permissions are granted.
- **Votes:** creates a bigint identity primary key, bigint caption foreign key, user foreign key, a `1`/`-1` check, timestamp, and unique `(caption_id, user_id)` constraint. Users can select, insert, and update only their own votes. The UPDATE grants match all fields written by the existing upsert. No delete permission is granted.
- **Profiles:** enables RLS, allows users to select their own ID/name/avatar fields, and update only their own names/avatar URL. The existing signup trigger remains responsible for creating profile rows and is untouched.
- **Storage and other tables:** no changes. The existing profile UI uploads avatars, but no verified database-policy problem justifies changing storage policies. No generic rules are applied to other or future public tables.

The script uses ordinary RLS policies with existence checks for reruns. It is intended for the confirmed live schema, where the earlier, broader draft has not been executed. It does not remove policies from an already-applied earlier draft.

## Implementation

- `app/page.tsx`: authenticated caption feed, generator, current user's saved votes, and compact selected-vote styling.
- `app/actions.ts`: validates sessions and input, calls Gemini server-side, inserts captions, and upserts votes. Browser-supplied user IDs are ignored. Successful writes refresh `/`.
- `components/CaptionGenerator.tsx`: topic form with pending and error/success states.
- `components/CaptionVotes.tsx`: accessible thumbs-up/down buttons, disabled while saving.
- `supabase/inspect.sql`: read-only live database inventory.
- `supabase/week4.sql`: additive schema setup, RLS, and minimum permissions.
- `.env.example` and `.gitignore`: document configuration while keeping real environment files ignored.
- `package.json` and `package-lock.json`: official Gemini SDK dependency.

## Local checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Validation performed during implementation:

- Lint passed with one pre-existing `next/image` warning in `app/profile/page.tsx`.
- TypeScript passed.
- `npm run build` could not complete in this execution environment: first Google Fonts network access was blocked, then Turbopack's internal worker port was blocked. With network access, **`npm run build -- --webpack` passed**.
- The production server returned `/login` redirects for logged-out requests to `/` and `/members`; `/login` returned 200 and the Google login button.
- The revised, simplified SQL has not been executed, as requested. Earlier PostgreSQL test results applied to the previous draft and do not validate this revision.
- 19 temporary server-action checks passed with mocked Supabase/Gemini: authentication, validation, exact prompt persistence, ignoring forged user IDs, API/database failures, and vote conflict handling. These do not verify live Gemini or OAuth.
- `npm audit` reports six findings in existing Next.js/ESLint dependencies (five high, one critical). The critical advisory concerns `next/og` ImageResponse, which this app does not use. Framework upgrades were left outside this Week 4 implementation; do not run `npm audit fix --force`, which proposes an ESLint configuration downgrade.

## Manual verification

Use SQL Editor as the database owner to inspect saved rows. For RLS checks, use the anon key or an ordinary signed-in user's session; SQL Editor's owner role bypasses RLS.

- [ ] Incognito: `/` and `/members` redirect to login. Direct unauthenticated generation/vote actions reject requests.
- [ ] Google login, `/auth/callback`, profile editing/avatar upload, and logout still work, including a first-time user's profile creation.
- [ ] Generate a caption about `Columbia dining halls`; confirm loading state, new feed card, and saved `caption_text`, exact `prompt`, correct `user_id`, and `created_at` in Supabase.
- [ ] Empty topics are rejected. API/quota and database errors show readable messages.
- [ ] Upvote: one row with `vote = 1`. Reload: thumbs-up stays selected.
- [ ] Downvote the same caption: the row ID stays the same, vote becomes `-1`, and `(caption_id, user_id)` still has exactly one row. Reload again.
- [ ] A second user sees their own vote state and cannot read/change the first user's votes or profile.
- [ ] Direct unauthenticated database inserts are denied. A signed-in user cannot forge another UUID on captions/votes, submit a vote other than `1`/`-1`, edit privileged profile fields, or edit another user's profile.
- [ ] Re-run `inspect.sql` and confirm all application tables have RLS and appropriate access. Review any additional schemas/views/RPCs.

## Deployment

After SQL setup, adding the Gemini key, and local testing, commit and push the changes (no commit or push has been performed for you):

```bash
git add .gitignore .env.example README.md app/page.tsx app/actions.ts components/CaptionGenerator.tsx components/CaptionVotes.tsx package.json package-lock.json supabase/inspect.sql supabase/week4.sql
git commit -m "Add Week 4 AI caption generation and voting"
git push
```

In your existing Vercel project:

1. Add server-only `GEMINI_API_KEY` to the deployment environments you use; retain existing Supabase variables.
2. Deploy the pushed commit (or redeploy after changing environment variables).
3. Turn **Deployment Protection off**, as required by the assignment.
4. Confirm the production `/auth/callback` URL is allowed by your existing Supabase/Google OAuth configuration.
5. Test production in Incognito: login, generation, voting, persistence after refresh, and logout.
6. Submit the **commit-specific Vercel deployment URL** and complete the week's Humor Study.

The live SQL migration, Gemini request, Google OAuth round trip, PM feedback session, and Vercel deployment still require your project credentials or manual participation. Use your PM's actual feedback for iteration; no feedback is fabricated here.
