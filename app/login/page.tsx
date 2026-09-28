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
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={handleGoogleLogin}
        className="rounded-lg bg-black px-6 py-3 text-white"
      >
        Sign in with Google
      </button>
    </main>
  );
}
