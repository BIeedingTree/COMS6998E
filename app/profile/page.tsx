"use client";

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
    return <main className="p-8">Loading...</main>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold">Profile</h1>

        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover"
          />
        )}

        <div>
          <label className="block mb-1">Profile photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setAvatarFile(e.target.files?.[0] ?? null)
            }
          />
        </div>

        <div>
          <label className="block mb-1">First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1">Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-white"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>

        <LogoutButton />
      </form>
    </main>
  );
}
