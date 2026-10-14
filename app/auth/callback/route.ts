import { isEligibleUser } from "@/lib/auth/eligibility";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user }, error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return NextResponse.redirect(`${origin}/login?reason=auth`);

      if (!isEligibleUser(user)) {
        await supabase.auth.signOut({ scope: "local" });
        return NextResponse.redirect(`${origin}/login?reason=eligibility`);
      }

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (!profile?.first_name || !profile?.last_name) {
          return NextResponse.redirect(`${origin}/profile`);
        }
        return NextResponse.redirect(`${origin}/`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?reason=auth`);
}
