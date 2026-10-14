import LoginScreen from "@/components/LoginScreen";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/login" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <LoginScreen reason={reason === "eligibility" || reason === "auth" ? reason : undefined} />;
}
