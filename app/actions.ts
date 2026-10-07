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
    if (authError || !user) return { error: "Please sign in to generate a post." };

    const value = formData.get("topic");
    const topic = typeof value === "string" ? value.trim() : "";
    if (!topic || topic.length > 200) {
      return { error: "Enter a topic between 1 and 200 characters." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: "Post generation is not configured yet. Please try again later." };

    const prompt = `Write one short, funny social-media-style post about:

${topic}

The audience is college students, especially Columbia students living in New York City.
Imagine Sam: a chronically online junior from the Midwest who lives in the dorms and explores NYC on weekends. Let that perspective subtly influence the humor without naming Sam.
The tone should be witty, casual, observational, and chronically online.
The post must work entirely as text without an accompanying image.
Use one or two short sentences, under 300 characters.
Do not wrap the response in quotation marks. Do not use Markdown, fake usernames, or excessive hashtags.
Do not explain the joke or prefix the response with anything.
Return only the final post.`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: { httpOptions: { timeout: 30_000 } },
    });
    const caption = response.text?.trim();
    if (!caption || caption.length > 500) {
      return { error: "Gemini did not return a usable short post. Please try another topic." };
    }

    const { error } = await supabase.from("captions").insert({
      caption_text: caption,
      prompt,
      user_id: user.id,
    });
    if (error) {
      return { error: "Your post could not be saved. Please try again." };
    }
  } catch {
    return { error: "Post generation failed. Please try again in a moment." };
  }

  revalidatePath("/");
  return { message: "Your AI post is on the timeline." };
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
      return { error: "Choose a valid post and a Funny or Miss reaction." };
    }

    const { error } = await supabase.from("caption_votes").upsert({
      caption_id: captionId,
      user_id: user.id,
      vote: Number(vote),
    }, { onConflict: "caption_id,user_id" });

    if (error) {
      return { error: error.code === "23503"
        ? "This post is no longer available. Refresh the page."
        : "Your vote could not be saved. Please try again." };
    }
  } catch {
    return { error: "Your vote could not be saved. Please try again." };
  }

  revalidatePath("/");
  return { message: "Vote saved." };
}
