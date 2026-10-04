"use server";

import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; message?: string };

export async function generateCaption(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Please sign in to generate a caption." };

    const value = formData.get("topic");
    const topic = typeof value === "string" ? value.trim() : "";
    if (!topic || topic.length > 200) {
      return { error: "Enter a topic between 1 and 200 characters." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "Caption generation is not configured yet. Please try again later." };

    const prompt = `Write exactly one short, funny caption about the following topic:

${topic}

The audience is college students at Columbia who enjoy campus life and exploring New York City.
Keep the caption to one sentence, under 300 characters.
Do not include quotation marks.
Return only the caption and nothing else.`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: { httpOptions: { timeout: 30_000 } },
    });
    const caption = response.text?.trim();
    if (!caption || caption.length > 500) {
      return { error: "Gemini did not return a usable short caption. Please try another topic." };
    }

    const { error } = await supabase.from("captions").insert({
      caption_text: caption,
      prompt,
      user_id: user.id,
    });
    if (error) {
      return { error: "Your caption could not be saved. Please try again." };
    }
  } catch {
    return { error: "Caption generation failed. Please try again in a moment." };
  }

  revalidatePath("/");
  return { message: "Caption saved! Find it at the top of the feed." };
}

export async function voteOnCaption(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "Please sign in to vote." };

    const captionId = formData.get("caption_id");
    const vote = formData.get("vote");
    // The inspected captions.id is bigint. Keep it as a string to avoid rounding.
    if (typeof captionId !== "string" ||
        !/^[0-9]{1,19}$/.test(captionId) ||
        BigInt(captionId) > BigInt("9223372036854775807") ||
        (vote !== "1" && vote !== "-1")) {
      return { error: "Choose a valid caption and a thumbs-up or thumbs-down vote." };
    }

    const { error } = await supabase.from("caption_votes").upsert({
      caption_id: captionId,
      user_id: user.id,
      vote: Number(vote),
    }, { onConflict: "caption_id,user_id" });

    if (error) {
      return { error: error.code === "23503"
        ? "This caption is no longer available. Refresh the page."
        : "Your vote could not be saved. Please try again." };
    }
  } catch {
    return { error: "Your vote could not be saved. Please try again." };
  }

  revalidatePath("/");
  return { message: "Vote saved." };
}
