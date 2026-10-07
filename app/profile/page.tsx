"use client";

import AppShell from "@/components/AppShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/LogoutButton";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFirstName(profile.first_name ?? "");
        setLastName(profile.last_name ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      }

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile);

      if (uploadError) {
        console.error(uploadError);
        alert("Avatar upload failed.");
        setSaving(false);
        return;
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      newAvatarUrl = data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        avatar_url: newAvatarUrl,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(updateError);
      alert("Profile update failed.");
      setSaving(false);
      return;
    }

    setAvatarUrl(newAvatarUrl);
    setAvatarFile(null);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="profile-loading">
        Loading your profile…
      </main>
    );
  }

  return (
    <AppShell active="profile">
      <header className="page-header"><div><p className="eyebrow">MAKE YOURSELF AT HOME</p><h1>Your profile<span className="brand-dot">.</span></h1><p>The person behind the reactions.</p></div></header>
      <div className="profile-wrap">
        <form
          onSubmit={handleSave}
          className="profile-form space-y-6"
        >
          <div>
            <h2 className="text-xl font-semibold">The basics</h2>
            <p className="mt-2 text-sm text-stone-500">
              Update your personal information and profile photo.
            </p>
          </div>

          {avatarUrl && (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-28 w-28 rounded-full border border-gray-200 object-cover shadow-sm"
            />
          )}

          <div>
            <label className="mb-2 block font-medium">
              Profile photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setAvatarFile(e.target.files?.[0] ?? null)
              }
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              First name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Last name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="primary-button"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>

            <LogoutButton />
          </div>
        </form>
      </div>
    </AppShell>
  );
}
