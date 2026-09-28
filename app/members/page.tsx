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
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Members Only</h1>
        <p className="mt-2">
          You can see this page because you are logged in.
        </p>
      </div>
    </main>
  );
}
