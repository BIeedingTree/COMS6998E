"use client";

import Icon from "@/components/Icon";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="nav-item logout-button"
    >
      <Icon name="logout" /> <span>Log out</span>
    </button>
  );
}
