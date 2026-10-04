import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import CaptionGenerator from "@/components/CaptionGenerator";
import CaptionVotes from "@/components/CaptionVotes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Caption = {
  id: number | string;
  caption_text: string;
  created_at: string;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("captions")
    .select("id, caption_text, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-zinc-900">
        <h1 className="text-3xl font-bold">Captions</h1>
        <p className="mt-4 text-red-600">
          Error loading captions: {error.message}
        </p>
      </main>
    );
  }

  const captions = (data ?? []) as Caption[];
  const { data: votes, error: votesError } = await supabase
    .from("caption_votes")
    .select("caption_id, vote")
    .eq("user_id", user.id);
  const selectedVotes = new Map(
    (votes ?? []).map((vote) => [String(vote.caption_id), Number(vote.vote)]),
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 text-zinc-900 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              Captions
            </h1>

            <p className="mt-2 text-gray-600">
              Signed in as {user.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/profile"
              className="rounded bg-gray-200 px-4 py-2"
            >
              Profile
            </Link>

            <Link
              href="/members"
              className="rounded bg-gray-200 px-4 py-2"
            >
              Members
            </Link>

            <LogoutButton />
          </div>
        </div>

        <CaptionGenerator />

        <h2 className="mb-4 text-2xl font-semibold">Caption feed</h2>
        {votesError && (
          <p role="alert" className="mb-4 text-red-700">
            Your votes could not be loaded. Refresh the page to try again.
          </p>
        )}

        <div className="space-y-4">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm"
            >
              <p className="text-lg break-words">
                {caption.caption_text}
              </p>
              {!votesError && (
                <CaptionVotes
                  captionId={String(caption.id)}
                  selectedVote={selectedVotes.get(String(caption.id)) ?? null}
                />
              )}
            </div>
          ))}
        </div>

        {captions.length === 0 && (
          <p className="text-gray-500">
            No captions yet. Generate the first one above.
          </p>
        )}
      </div>
    </main>
  );
}
