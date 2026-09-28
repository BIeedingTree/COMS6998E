import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

type Caption = {
  id: number;
  caption_text: string;
  created_at: string;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gated UI: logged-out users cannot see captions.
  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center text-zinc-900">
        <div className="text-center space-y-5">
          <h1 className="text-4xl font-bold">Captions</h1>

          <p className="text-gray-600">
            Sign in to view captions.
          </p>

          <Link
            href="/login"
            className="inline-block rounded-lg bg-black px-6 py-3 text-white"
          >
            Sign in with Google
          </Link>
        </div>
      </main>
    );
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

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              Captions
            </h1>

            <p className="mt-2 text-gray-600">
              Signed in as {user.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
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

        <p className="mb-8 text-gray-600">
          Captions loaded from Supabase
        </p>

        <div className="space-y-4">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm"
            >
              <p className="text-lg">
                {caption.caption_text}
              </p>
            </div>
          ))}
        </div>

        {captions.length === 0 && (
          <p className="text-gray-500">
            No captions found.
          </p>
        )}
      </div>
    </main>
  );
}
