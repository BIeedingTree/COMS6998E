import { requireEligibleUser } from "@/lib/auth/require-user";
import ProfileForm from "@/components/ProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/profile" } };

export default async function ProfilePage() {
  await requireEligibleUser();
  return <ProfileForm />;
}
