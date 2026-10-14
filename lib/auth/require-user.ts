import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEligibleUser } from "@/lib/auth/eligibility";

export async function requireEligibleUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if (!isEligibleUser(user)) redirect("/login?reason=eligibility");
  return { supabase, user };
}
