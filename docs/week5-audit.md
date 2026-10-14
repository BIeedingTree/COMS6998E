# Week 5 iteration audit — private drafts and optional community

Status: implemented locally; the new SQL is review-only and has not been executed. No database connection was used to change live state, no legacy rows were deleted, and no push or deployment was performed. The latest private-workspace specification supersedes earlier shared-feed/Members/cleanup instructions.

## Product behavior

`/` opens My Drafts after the existing login/profile-onboarding flow. It contains the composer and only the caller's drafts, newest first (null legacy timestamps last). Private and shared drafts remain here, with Copy and explicit publish/unpublish controls, without rating controls. Generation focuses the newly saved card and retains the entered situation/options for revision or retry.

`/community` lists only explicitly published drafts, newest publication first. Its category filters use validated URL parameters. Cards show type, category, subject when applicable, body, date, Copy, and aggregate ratings with the caller's selected vote. They contain no names, emails, UUIDs or prompts. Publishing updates the existing caption; unpublishing clears its publication timestamp but retains its caption and votes. Community access still requires an eligible signed-in account: `is_public` means shared within this protected app, not anonymously readable on the internet.

Email generation requests structured JSON through the installed `@google/genai` SDK's `responseMimeType` and `responseJsonSchema`. The server validates a nonempty, single-line subject of at most 200 characters and a nonempty body of at most 2,000. Non-email output must have `subject: null`. Invalid JSON/fields do not get saved. The exact full `contents` prompt is stored in `captions.prompt`, the body in `caption_text`, and metadata plus the server-verified user ID alongside `is_public: false`. Copy formats email as `Subject: …`, a blank line, then the body. Recipient/tone still live only in the prompt.

Nineteen quick starts cover academic requests (5), career follow-ups (4), clubs/teamwork (3), housing (3), and social conversations (4). Category selection changes the relevant starters. Shared drafts have subtle category chips; the interface retains the warm neutral/plum palette, readable paragraphs, keyboard focus, pending states, and mobile tabs.

Members has been removed, including its page, navigation link and icon reference. Profile/avatar code, provider flow and logout are preserved.

## Every proposed database change

Review **`supabase/week5-drafts.sql`**. It assumes the existing Week 4 `captions` and `caption_votes` schema, including bigint identity IDs, nullable caption ownership/prompt, unique `(caption_id,user_id)`, and the `vote in (1,-1)` constraint. It runs as one BEGIN/COMMIT transaction when the owner chooses to execute it. It has not been tested by executing SQL, even locally.

1. **Five fields on `captions`:** nullable `subject text`; `message_type text not null default 'message'`; `category text not null default 'other'`; `is_public boolean not null default false`; nullable `published_at timestamptz`. On initial application, all existing records remain valid and private. Reapplying the migration does not reset intentional sharing.
2. **One metadata CHECK constraint:** permits the three message types and six categories; requires a nonblank single-line email subject (up to 200 characters), null non-email subjects, a nonnull owner/timestamp for published rows, and a null publication timestamp for private rows. Legacy records get compatible defaults, without deletion or reclassification based on their prompt.
3. **Two indexes:** `(user_id, created_at desc, id desc)` for the private workspace and `(published_at desc, id desc) where is_public` for Community. Existing vote indexes and uniqueness are retained.
4. **RLS policy replacement only on `captions` and `caption_votes`:** removes their old policies before installing the new ordinary policies. This is necessary because permissive policies combine with OR; retaining Week 4's broad authenticated SELECT would expose private drafts. This deliberately includes replacement of the misleadingly named old `Allow public read access to captions` policy. No generic block touches other/future tables.
5. **Caption privileges and policies:** revoke old table/column grants from PUBLIC, anon and authenticated. Authenticated users may SELECT only safe output/metadata columns on eligible rows; INSERT only generation fields for their own UID, initially private; UPDATE only `is_public` and `published_at`, only on their own rows. No caption DELETE or ownership/prompt/body UPDATE is granted. SELECT requires eligible authentication and either ownership or explicit publication with a nonnull owner. Anonymous users have no access.
6. **Vote privileges and policies:** SELECT only `caption_id,user_id,vote` for the caller's own votes on published captions. INSERT/UPDATE only `caption_id,user_id,vote`, with own-user and published-caption checks on both existing and resulting rows. Grant own-vote DELETE on published captions so toggling actually removes a row. Existing uniqueness and ±1 constraints continue to enforce one vote per user/draft. Unpublished historical votes remain stored but unreadable/unrateable through these policies. This explicitly addresses the previous missing-DELETE-policy blocker in the proposed migration.
7. **Sequence privileges:** resolve both existing identity sequences with `pg_get_serial_sequence`, fail the transaction if an expected sequence is missing, and grant authenticated USAGE safely. No fragile hardcoded sequence names.
8. **`week5_is_eligible_student()` → boolean:** looks up the current `auth.uid()` in `auth.users`; requires confirmed email with exactly `columbia.edu` or `barnard.edu` (case insensitive). It accepts no email/owner parameter and uses no editable user metadata. Policies and the two data RPCs use it to protect direct Data API access as well as the server routes.
9. **`get_my_drafts(p_draft_id bigint default null)` → safe draft fields only:** explicitly restricts rows to the current eligible owner; optionally selects one owned ID for the publish action's ownership check. Returns no prompt or owner UUID. This avoids granting caption `user_id` SELECT, which would otherwise allow Community author discovery through the Data API.
10. **`get_community_rating_counts(p_caption_ids bigint[] default null)` → `caption_id,positive_count,negative_count`:** aggregates all users' ratings for eligible callers, only on published, owned captions. Optional ID filtering limits the app's request to visible cards. Zero-vote published rows return zero counts. Private/unpublished/ownerless IDs return no row, including when requested by their owner. No voter identity is returned.
11. **RPC hardening:** all three functions are STABLE SECURITY DEFINER, have fixed empty `search_path`, use schema-qualified relations/functions and explicit caller checks, revoke PUBLIC/anon execution, and grant execution only to authenticated. They contain no writes or dynamic query parameters. Definer access is necessary for the protected eligibility lookup, private owner filtering without revealing author IDs, and cross-user aggregates without expanding own-vote SELECT. The transaction closes the initial default-execute window.
12. **PostgREST schema reload notification** after changes, then COMMIT.

Unchanged: profile schema and existing own-row RLS, avatar `storage.objects` policies, signup trigger, auth users, table/column names, historical rows and votes. The old legacy cleanup file remains unexecuted and must not be run for this iteration. Do not reapply `week4.sql` after this migration, because its old read policy/grants do not implement the new privacy model.

This migration should be applied by the database owner through the normal Supabase SQL Editor only after review. Until applied, the new app intentionally reports load/save errors rather than falling back to the old broad feed. Coordinate the code release and migration; old code will not work correctly with the new privacy model.

Reference checks: [PostgreSQL privileges](https://www.postgresql.org/docs/current/sql-revoke.html), [security-definer function guidance](https://www.postgresql.org/docs/current/sql-createfunction.html), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). Installed SDK declarations and local Next.js 16.3.5 docs were also inspected.

## Action and rating behavior

All three actions invoke the existing verified-user guard before any API/database work. Generation ignores caller-supplied ownership/publication fields. Publishing validates the ID and target state, checks the owner-only RPC, updates only two sharing fields, and verifies that one visible row actually changed; RLS independently limits the update. Both collections are revalidated.

Voting first verifies the caption is published, even if the caller owns it. RLS repeats that check when inserting/updating/deleting. Same vote deletes the caller's matching row and verifies it was removed; opposite/no vote uses the existing unique-key upsert. Missing/inaccessible/private drafts are rejected. The Community path is revalidated for authoritative selection/counts.

Optimistic updates use an explicit desired selection, adjust both aggregate counts relative to the current selection, clamp at zero, and are stable if refreshed server props arrive before the transition ends. Handled/transport failures restore the server-provided baseline. Counts are aggregate snapshots; other users' votes appear on refresh/revalidation (no realtime subscription was added). If counts or the caller's vote cannot load, controls are unavailable rather than displaying invented totals.

## Authentication and external settings

Existing code checks confirmed `@columbia.edu` and `@barnard.edu` accounts on protected routes/actions. The OAuth callback rejects other domains and locally signs out an ineligible account. Generation, Profile/avatar, login and logout provider behavior were preserved. The migration adds the same eligibility boundary to caption/vote data access; it does not change provider configuration or profile permissions.

The repo cannot establish Google Cloud audience or Supabase dashboard settings. Manually verify that the Google OAuth audience is not Internal-only to Columbia if Barnard access is required; review External audience/test-user restrictions and any Workspace administrator restrictions. Confirm Supabase's Google provider, site/redirect URLs, and any signup restrictions accept the intended accounts. No actual Barnard Google login was performed, and no external OAuth settings were changed.

## Automated and local validation

- `node --test tests/week5.test.cjs`: **86 passed**, 0 failed. Real eligibility helper, actions, protected pages and OAuth callback run against mocked Supabase/Gemini. Tests cover exact prompt/owner/private fields, structured email validation, invalid metadata, owner publication, failed/zero-row writes, all six rating transitions, private-vote rejection, aggregate adjustments/rebasing, safe Community projection/category filtering, owner workspace query, Copy formatting and Members removal.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with one pre-existing avatar `<img>` optimization warning in `components/ProfileForm.tsx`; no errors.
- `npm run build`: passed using the normal Turbopack production build. It reports the existing ignored package-lock outside the repository warning.
- Actual local production HTTP: `/`, `/community`, `/profile` return 307 to `/login` without a session; `/members` returns 404.
- Isolated browser fixtures use the real pages/components/CSS with local mock actions/data, never live Supabase. Checked generation pending/retained inputs/new-card focus, email subject rendering, explicit publication confirmation, shared state, private generation absent from Community, category filtering, vote-removal persistence after fixture reload, immediate count changes, and rollback on simulated failure.
- Responsive inspection: 1440px desktop, 390px mobile and 320px narrow mobile have no measured horizontal overflow. Publication/unpublication retained the private card and removed it from Community; filtering then showed the category empty state. Email Copy reported success. A native clipboard round trip remains manual.

These checks do **not** prove production Gemini responses, live database grants/RLS/RPC execution, cross-account authorization, or OAuth provider configuration. Those remain deliberate manual checks because SQL execution/deployment were excluded from this task.

## Manual verification after reviewing/applying SQL

Use two eligible accounts (A and B), one noneligible account, and an Incognito session. Use ordinary user sessions for Data API checks, not a service-role key or database-owner SQL session, which bypass RLS.

| Assignment checks | What to verify |
| --- | --- |
| 1–5: private generation | Generate as A, see newest in My Drafts, confirm absent from Community, refresh and see it persist, verify B cannot retrieve that private ID directly. Check exact stored prompt/owner/private state using the database owner's inspection tools. |
| 6–10: publishing | Publish as A; same ID remains in My Drafts and appears for B in Community. Inspect HTML/network and direct SELECT attempts: prompt/owner UUID are unavailable. B cannot publish/unpublish A's row, including through crafted requests. |
| 11–12: unpublishing | Remove as A; B's refreshed Community and aggregate RPC omit it. A retains the draft; historical vote rows remain. Republish and verify those counts return. |
| 13–15: email | Generate a real email and text/other draft through Gemini. Subject/body persist; non-email subject is null. Email Copy/paste includes subject and body with paragraph breaks. |
| 16–23: votes/counts | Exercise all six transitions, reload after each, confirm one row maximum, and compare A/B aggregate totals. Direct vote reads must reveal only the caller's own rows, with no identities of other voters. Try an unauthorized other-user update/delete. |
| 24: unpublished voting | Call the action and direct Data API against a private/unpublished caption; both must deny voting. Counts RPC must return no row for its ID. Check an ownerless legacy ID too. |
| 25–28: auth | Test real Columbia and Barnard Google accounts, rejected other/unconfirmed domains, logged-out redirects and logout. Direct caption/vote/RPC access by anon/noneligible sessions must fail or return no data. |
| 29–33: remaining UX | Save Profile names/avatar; confirm Members 404; real clipboard round trip; all category filters, keyboard focus, empty/error/pending states and phone widths. Check legacy null dates do not break cards. |
| Database permissions | Confirm direct private insertion cannot forge an owner or begin published; ownership/body/prompt UPDATE is denied; only two sharing fields can change; metadata constraints reject invalid subject/type/category/publication combinations. |
| Production | After your own deployment, turn Vercel Deployment Protection OFF, test Incognito, generation, publication, votes, counts, refresh, Profile and both schools on the production URL. Submit the commit-specific deployment URL. |

## Week 5 rubric audit

These are evidence/status notes, not an awarded score.

| Rubric item | Points | Implementation and remaining evidence |
| --- | ---: | --- |
| End-to-end app | 15 | Generate → privately save → copy → explicitly publish → rate; build, action tests and UI fixtures pass. Complete real two-account/Gemini flow after SQL review/application. |
| Supabase integration | 10 | Existing tables retained; private/public state, owner lookup, persisted metadata, own votes and aggregate RPC prepared. Live migration/RLS/RPC validation pending. |
| Authentication/route protection | 10 | Confirmed Columbia/Barnard server checks preserved; redirects tested; proposed DB eligibility closes direct caption/vote access. Real provider account tests pending. |
| Voting/data mutation | 10 | Six transitions tested, one-vote uniqueness retained, own DELETE proposed, published-only checks, optimistic counts and rollback verified. Cross-account persistence/counts need live verification. |
| Public Vercel deployment | 5 | Production build passes; no deployment performed. Owner must deploy, disable Deployment Protection, and verify Incognito/commit-specific URL. |
| Visual design/layout | 25 | Distinct workspace/library tabs, private/shared state, email hierarchy, subtle tags, warm/plum design, responsive controls and polished empty states. Gather real PM feedback. |
| Usability/intuitiveness | 25 | Private default protects personal situations; reusable saved drafts, nineteen campus starters, email Copy and intentional sharing give repeat-use value. Complete clipboard, real-device and PM feedback checks. |
| Standout bonus potential | +5 | A useful personal writing assistant plus anonymous campus examples, with privacy enforced beyond the UI. Bonus is not guaranteed. |

## Files changed in this iteration

- `app/actions.ts`: structured private generation, owner publication action, published-only rating check.
- `app/page.tsx`: My Drafts owner workspace; `app/community/page.tsx` (new): safe published feed, category filters and aggregate/own ratings.
- `components/MessageComposer.tsx`, `MessageCard.tsx`, `CaptionVotes.tsx`: metadata controls, email cards/copy, private/community modes and optimistic counts.
- `components/DraftTabs.tsx`, `PublishControl.tsx` (new): collection navigation and explicit sharing UX.
- `components/AppShell.tsx`, `Icon.tsx`, `LoginScreen.tsx`, `app/globals.css`: navigation, private-workspace copy, responsive presentation.
- `lib/drafts.ts`, `lib/message-templates.ts` (new): shared types/validation/formatting/count logic and nineteen quick starts.
- `app/members/page.tsx`: removed.
- `supabase/week5-drafts.sql` (new): unexecuted migration described above.
- `tests/week5.test.cjs`, `README.md`, this audit: expanded verification and current setup/review instructions.

Existing uncommitted work from the earlier iteration was preserved, including auth helpers/callback protection, the Profile server wrapper/client form, CopyButton and earlier visual work. Original Week 4 SQL, storage, configuration/secrets and package dependencies were not rewritten for this iteration.
