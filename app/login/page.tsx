"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 flex items-center justify-center text-zinc-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-4xl font-bold">Captions</h1>

        <p className="mt-3 text-gray-600">
          Sign in to view captions and manage your profile.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="mt-8 w-full rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition hover:bg-zinc-700"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
