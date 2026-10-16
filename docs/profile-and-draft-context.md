# Profile, draft context and legacy cleanup — October 14, 2026

## Changes

- Profile: dedicated photo card, circular image/initials preview, accessible file picker, undo-selection control, JPG/PNG/WebP/GIF validation (up to 5 MB), responsive name fields and inline loading/error/success states. Save uses the verified user's own ID; the avatar bucket and its policies are unchanged. Pending saves disable edits. A profile update must return a visible saved row before success is shown.
- Community: main heading changed to “Say It Better.”
- My Drafts: a “Your original request” section above each generated message, visible only to its owner. The server extracts the user's situation from the saved exact generation prompt. Model instructions are not mixed into the draft context. Unknown legacy formats remain explicitly unavailable.
- Cleanup: replaced the old broad prompt-based deletion proposal with exact ID/text matches for the four known obsolete humor captions, IDs 5, 6, 7 and 8. Useful non-email messages are retained.

## Manual SQL / release order

1. Run `supabase/week5-private-prompts.sql` in the correct Supabase project before deploying the UI. It adds only a prompt-read RPC and its authenticated EXECUTE grant. The function uses a fixed empty search path, verified eligibility and `auth.uid()` ownership, even for shared drafts. No existing table privileges, RLS or storage policies are altered. Do not rerun the older Week 4 or full Week 5 migrations for this change.
2. For cleanup, run only STEP 1 of `supabase/remove-legacy-drafts.sql` and review the four candidate IDs and their text. STEP 2 permanently removes only exact non-email matches and their dependent votes in one transaction. Changed IDs/text will be skipped; unrecognized prompts or a non-email type alone are never deletion criteria. Other accounts/unknown legacy records were not inventoried through an admin connection.
3. Deploy the code when ready. Check an existing email in My Drafts: its initial request should appear, while the same shared draft in Community must not expose that request. Retest a real profile photo upload, save, and refresh with an ordinary eligible user.

Neither SQL file was executed. The available dashboard was signed out and the owner requested prepared SQL instead. No push or deployment was performed.

## Validation

- 92 automated tests passed, including existing generation/voting/auth behavior, prompt extraction, failed prompt-query fallback, private prompt display and suppression in Community, and avatar format/size validation.
- TypeScript passed; lint passed with zero warnings/errors.
- Webpack production build passed (`npm run build -- --webpack`). Default Turbopack was not rerun; the preceding audit documented its local port-permission failure.
- Isolated browser preview used the real components/CSS and mocked auth/data: desktop and 390px mobile profile layout, save feedback, original-request cards and Community heading were inspected. Profile and draft content had no horizontal overflow at 390px.
- Browser file selection/upload was not completed because file-upload permission was declined. It was not retried or bypassed. A real photo selection/preview/upload/persistence test remains necessary.
- The new SQL was reviewed but not executed or tested against live PostgreSQL. No live records were changed in this turn.
