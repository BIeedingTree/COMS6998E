import { MAX_MESSAGE_LENGTH } from "@/lib/message-options";

export const MESSAGE_TYPES = [
  { value: "email", label: "Email" },
  { value: "message", label: "Text / Message" },
  { value: "other", label: "Other" },
] as const;
export const CATEGORIES = [
  { value: "academic", label: "Academic" }, { value: "career", label: "Career" },
  { value: "clubs", label: "Clubs" }, { value: "housing", label: "Housing" },
  { value: "social", label: "Social" }, { value: "other", label: "Other" },
] as const;
export type MessageType = typeof MESSAGE_TYPES[number]["value"];
export type Category = typeof CATEGORIES[number]["value"];
export const MAX_SUBJECT_LENGTH = 200;
export type Draft = {
  id: string | number;
  caption_text: string;
  created_at: string | null;
  subject: string | null;
  message_type: MessageType;
  category: Category;
  is_public: boolean;
  published_at: string | null;
};
// Intentionally excludes both the original prompt and the owner's identity.
export const COMMUNITY_FIELDS = "id,caption_text,created_at,subject,message_type,category,is_public,published_at";
export type RatingCounts = { positive: number; negative: number };
// Display the user's situation, not the surrounding model instructions. Older
// unrecognized prompt formats are left unavailable rather than guessed.
export function originalRequest(prompt: string | null | undefined): string | null {
  if (!prompt?.startsWith("You are an expert at helping people phrase difficult or awkward messages clearly and naturally.")) return null;
  const start = prompt.indexOf("\nSituation:\n");
  const end = prompt.lastIndexOf("\n\nRecipient:\n");
  if (start < 0 || end <= start) return null;
  return prompt.slice(start + "\nSituation:\n".length, end).trim() || null;
}
export function isMessageType(value: unknown): value is MessageType {
  return MESSAGE_TYPES.some(option => option.value === value);
}
export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some(option => option.value === value);
}
export function isDraftId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value) && BigInt(value) <= BigInt("9223372036854775807");
}
export function parseGeneration(text: string | undefined, type: MessageType): { subject: string | null; message: string } | null {
  try {
    const value: unknown = JSON.parse(text ?? "");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const result = value as Record<string, unknown>;
    if (typeof result.message !== "string" || !result.message.trim() || result.message.trim().length > MAX_MESSAGE_LENGTH) return null;
    if (type === "email") {
      if (typeof result.subject !== "string" || !result.subject.trim() || result.subject.trim().length > MAX_SUBJECT_LENGTH || /[\r\n]/.test(result.subject)) return null;
      return { subject: result.subject.trim(), message: result.message.trim() };
    }
    return result.subject === null ? { subject: null, message: result.message.trim() } : null;
  } catch { return null; }
}
export function draftCopyText(draft: Pick<Draft, "message_type" | "subject" | "caption_text">) {
  return draft.message_type === "email" && draft.subject
    ? `Subject: ${draft.subject}\n\n${draft.caption_text}` : draft.caption_text;
}
export function optimisticRating(current: RatingCounts & { selected: number | null }, selected: number | null) {
  return {
    selected,
    positive: Math.max(0, current.positive - Number(current.selected === 1) + Number(selected === 1)),
    negative: Math.max(0, current.negative - Number(current.selected === -1) + Number(selected === -1)),
  };
}
