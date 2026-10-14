export const ELIGIBILITY_MESSAGE = "Say It Better is currently available to Columbia and Barnard students.";

export function isEligibleUser(user: { email?: string; email_confirmed_at?: string | null } | null): boolean {
  return Boolean(user?.email_confirmed_at && user.email && /^[^@\s]+@(columbia\.edu|barnard\.edu)$/i.test(user.email));
}
