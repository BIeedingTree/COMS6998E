"use server";

import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { requireEligibleUser } from "@/lib/auth/require-user";
import { RECIPIENTS, TONES, MAX_SITUATION_LENGTH, MAX_MESSAGE_LENGTH } from "@/lib/message-options";
import { isCategory, isDraftId, isMessageType, parseGeneration, MAX_SUBJECT_LENGTH } from "@/lib/drafts";

export type ActionState = { error?: string; message?: string; draftId?: string };

export async function generateCaption(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireEligibleUser();
  let draftId: string;
  try {
    const value = formData.get("situation");
    const situation = typeof value === "string" ? value.trim() : "";
    if (!situation || situation.length > MAX_SITUATION_LENGTH) {
      return { error: `Describe the situation in 1–${MAX_SITUATION_LENGTH} characters.` };
    }

    const recipient = formData.get("recipient") ?? "";
    const tone = formData.get("tone") ?? "";
    if (typeof recipient !== "string" || typeof tone !== "string" ||
        (recipient !== "" && !RECIPIENTS.some(option => option === recipient)) ||
        (tone !== "" && !TONES.some(option => option === tone))) {
      return { error: "Choose a recipient and tone from the available options, or leave them blank." };
    }

    const messageType = formData.get("message_type") ?? "message";
    const category = formData.get("category") ?? "other";
    if (!isMessageType(messageType) || !isCategory(category)) {
      return { error: "Choose a message type and category from the available options." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "Draft writing is not configured yet. Please try again later." };

    const prompt = `You are an expert at helping people phrase difficult or awkward messages clearly and naturally.

The user needs help writing a ${messageType === "email" ? "complete email with a subject and body" : "message"}.
Category: ${category}.

Situation:
${situation}

Recipient:
${recipient || "Not specified"}

Desired tone:
${tone || "Natural"}

Write exactly one ready-to-send message.

Requirements:
- Preserve the user's intent and sound natural and human.
- Be concise unless the situation clearly requires more detail; stay under ${MAX_MESSAGE_LENGTH} characters.
- Avoid unnecessary corporate language and excessive apologizing.
- Match the requested tone.
- Do not invent names, facts, reasons, promises, or details the user did not provide.
- If a name is not provided, use a natural greeting without a name. Do not add placeholder names or signatures.
- Do not explain your response or describe what you changed.
- Do not provide multiple options or use Markdown in the message.
- Return a JSON object with exactly two keys: "subject" and "message".
- ${messageType === "email" ? `The subject must be a concise, useful single-line email subject under ${MAX_SUBJECT_LENGTH} characters. Put only the email body in message.` : 'The subject must be JSON null. Put the complete message in message.'}
- Preserve natural paragraph breaks within the message string.`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        httpOptions: { timeout: 30_000 },
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object", additionalProperties: false,
          properties: {
            subject: { type: messageType === "email" ? "string" : "null" },
            message: { type: "string" },
          },
          required: ["subject", "message"],
        },
      },
    });
    const generated = parseGeneration(response.text, messageType);
    if (!generated) {
      return { error: "The AI didn’t return a usable message. Please try again." };
    }

    const { data, error } = await supabase.from("captions").insert({
      caption_text: generated.message,
      subject: generated.subject,
      message_type: messageType,
      category,
      prompt,
      user_id: user.id,
      is_public: false,
      published_at: null,
    }).select("id").single();
    if (error || !data) {
      return { error: "Your draft could not be saved. Please try again." };
    }
    draftId = String(data.id);
  } catch {
    return { error: "We couldn’t write your draft. Please try again in a moment." };
  }

  revalidatePath("/");
  return { message: "Saved to your private drafts.", draftId };
}

export async function voteOnCaption(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireEligibleUser();
  try {
    const captionId = formData.get("caption_id");
    const vote = formData.get("vote");
    // The inspected captions.id is bigint. Keep it as a string to avoid rounding.
    if (!isDraftId(captionId) ||
        (vote !== "1" && vote !== "-1")) {
      return { error: "Choose a valid draft and a Send it or Needs work rating." };
    }

    // Check publication even for an owner's private draft. RLS repeats this check
    // at mutation time, including if the owner unpublishes during this request.
    const { data: published, error: publicationError } = await supabase
      .from("captions").select("id").eq("id", captionId).eq("is_public", true).maybeSingle();
    if (publicationError || !published) {
      return { error: "This draft is no longer in Community. Refresh the page." };
    }

    const { data: existingVote, error: readError } = await supabase
      .from("caption_votes")
      .select("vote")
      .eq("caption_id", captionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) return { error: "Your current rating could not be checked. Please try again." };

    if (existingVote?.vote === Number(vote)) {
      const { error: deleteError } = await supabase
        .from("caption_votes")
        .delete()
        .eq("caption_id", captionId)
        .eq("user_id", user.id);

      // A successful DELETE returns no body. Removing an already-removed vote
      // is also safe; revalidation supplies the authoritative selection/counts.
      if (deleteError) {
        console.error("[voteOnCaption] Delete failed", {
          code: deleteError.code,
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
        });
        return { error: "Your rating could not be removed. Refresh and try again. If this continues, contact the app owner." };
      }

      revalidatePath("/community");
      return { message: "Vote removed." };
    }

    const { error } = await supabase.from("caption_votes").upsert({
      caption_id: captionId,
      user_id: user.id,
      vote: Number(vote),
    }, { onConflict: "caption_id,user_id" });

    if (error) {
      return { error: error.code === "23503"
        ? "This draft is no longer available. Refresh the page."
        : "Your vote could not be saved. Please try again." };
    }
  } catch {
    return { error: "Your vote could not be saved. Please try again." };
  }

  revalidatePath("/community");
  return { message: "Vote saved." };
}

export async function setDraftPublication(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireEligibleUser();
  const captionId = formData.get("caption_id");
  const visibility = formData.get("is_public");
  if (!isDraftId(captionId) || (visibility !== "true" && visibility !== "false")) {
    console.error("[setCaptionPublic] Invalid publish request", {
      captionId: typeof captionId === "string" ? captionId.slice(0, 64) : null,
      requestedPublicState: visibility,
    });
    return { error: "Choose a valid draft and sharing option." };
  }
  const isPublic = visibility === "true";
  try {
    // This RPC checks ownership using auth.uid() without exposing user_id.
    // The UPDATE policy checks ownership again at mutation time.
    const { data: owned, error: ownerError } = await supabase.rpc("get_my_drafts", { p_draft_id: captionId });
    if (ownerError || !owned?.some((draft: { id: string | number }) => String(draft.id) === captionId)) {
      return { error: "Only the owner can change this draft's sharing setting." };
    }
    const { error } = await supabase.from("captions")
      .update({ is_public: isPublic, published_at: isPublic ? new Date().toISOString() : null })
      .eq("id", captionId);
    if (error) {
      console.error("[setCaptionPublic] Update failed", {
        captionId,
        requestedPublicState: isPublic,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return { error: "Your sharing setting could not be saved. Please try again." };
    }
  } catch (error) {
    console.error("[setCaptionPublic] Update failed", {
      captionId,
      requestedPublicState: isPublic,
      code: null,
      message: error instanceof Error ? error.message : String(error),
      details: null,
      hint: null,
    });
    return { error: "Your sharing setting could not be saved. Please try again." };
  }
  revalidatePath("/");
  revalidatePath("/community");
  return { message: isPublic ? "Posted anonymously to Community." : "Removed from Community. Your draft is still saved here." };
}
