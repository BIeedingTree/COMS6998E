import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="mb-6 inline-block rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-zinc-800 shadow-sm transition hover:bg-gray-50"
        >
          ← Back to Captions
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">Members Only</h1>

          <p className="mt-3 text-gray-600">
            You can see this page because you are logged in.
          </p>
        </div>
      </div>
    </main>
  );
}
