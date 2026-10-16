"use client";

import AppShell from "@/components/AppShell";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isEligibleUser } from "@/lib/auth/eligibility";
import { avatarValidationError } from "@/lib/profile";
import Icon from "@/components/Icon";

export default function ProfileForm() {
  const [supabase] = useState(createClient);
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !isEligibleUser(user)) {
          router.replace(user ? "/login?reason=eligibility" : "/login");
          return;
        }
        const { data, error } = await supabase.from("profiles")
          .select("first_name, last_name, avatar_url").eq("id", user.id).single();
        if (error || !data) throw new Error("Profile unavailable");
        if (active) {
          setFirstName(data.first_name ?? "");
          setLastName(data.last_name ?? "");
          setAvatarUrl(data.avatar_url ?? null);
        }
      } catch { if (active) setLoadError(true); }
      finally { if (active) setLoading(false); }
    }
    void loadProfile();
    return () => { active = false; };
  }, [router, supabase]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function clearSelection() {
    setAvatarFile(null);
    setPreviewUrl(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    setMessage("");
    const validationError = avatarValidationError(file);
    if (validationError) {
      clearSelection();
      setError(validationError);
      return;
    }
    setError("");
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user || !isEligibleUser(user)) {
        router.replace(user ? "/login?reason=eligibility" : "/login");
        return;
      }
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        const validationError = avatarValidationError(avatarFile);
        if (validationError) { setError(validationError); return; }
        const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[avatarFile.type];
        const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile);
        if (uploadError) { setError("Your photo couldn’t be uploaded. Please try again."); return; }
        newAvatarUrl = supabase.storage.from("avatars").getPublicUrl(filePath).data.publicUrl;
      }
      const { data, error: updateError } = await supabase.from("profiles")
        .update({ first_name: firstName.trim(), last_name: lastName.trim(), avatar_url: newAvatarUrl })
        .eq("id", user.id).select("first_name").single();
      if (updateError || !data) { setError("Your profile couldn’t be saved. Please try again."); return; }
      setAvatarUrl(newAvatarUrl);
      clearSelection();
      setMessage("Your profile is saved.");
      router.refresh();
    } catch { setError("We couldn’t save your changes. Check your connection and try again."); }
    finally { setSaving(false); }
  }

  const photo = previewUrl ?? avatarUrl;
  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  return <AppShell active="profile">
    <header className="page-header"><h1>Profile</h1></header>
    <div className="profile-wrap">
      {loading ? <p className="profile-loading" role="status">Loading your profile…</p> : loadError ? <div className="profile-form"><p role="alert" className="inline-error">Your profile couldn’t be loaded.</p><button type="button" className="secondary-button" onClick={() => window.location.reload()}>Try again</button></div> :
      <form onSubmit={handleSave} className="profile-form" aria-busy={saving}>
        <div className="profile-photo-picker">
          <div className="profile-avatar" aria-label="Profile photo preview">
            {photo ? <Image src={photo} alt={previewUrl ? "Selected profile photo preview" : "Your profile photo"} width={112} height={112} unoptimized /> : <span aria-hidden="true">{initials || <Icon name="profile" width={40} height={40} />}</span>}
          </div>
          <div className="profile-photo-controls">
            <label className={`secondary-button photo-picker-label ${saving ? "is-disabled" : ""}`}>
              {photo ? "Change photo" : "Choose a photo"}
              <input ref={fileInput} type="file" className="photo-file-input" aria-label="Choose profile photo" aria-describedby="photo-help" accept="image/jpeg,image/png,image/webp,image/gif" disabled={saving} onChange={e => choosePhoto(e.target.files?.[0])} />
            </label>
            <p id="photo-help">JPG, PNG, WebP or GIF · up to 5 MB</p>
            {avatarFile && <div className="photo-selection"><span>{avatarFile.name}</span><button type="button" className="quiet-button" disabled={saving} onClick={() => { clearSelection(); setError(""); }}>Undo selection</button></div>}
          </div>
        </div>
        <div className="profile-name-fields">
          <div><label htmlFor="first-name">First name</label><input type="text" id="first-name" autoComplete="given-name" value={firstName} disabled={saving} onChange={e => { setFirstName(e.target.value); setMessage(""); }} /></div>
          <div><label htmlFor="last-name">Last name</label><input type="text" id="last-name" autoComplete="family-name" value={lastName} disabled={saving} onChange={e => { setLastName(e.target.value); setMessage(""); }} /></div>
        </div>
        <div className="profile-save-row"><button type="submit" disabled={saving} className="primary-button">{saving ? "Saving…" : "Save changes"}</button><p role="status" className="profile-save-status">{message}</p></div>
        {error && <p role="alert" className="inline-error">{error}</p>}
      </form>}
    </div>
  </AppShell>;
}
