import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Caption = {
  id: number;
  caption_text: string;
  created_at: string;
};

export default async function Home() {
  const { data, error } = await supabase
      .from("captions")
      .select("id, caption_text, created_at")
      .order("created_at", { ascending: false });

  if (error) {
    return (
        <main className="min-h-screen p-8">
          <h1 className="text-3xl font-bold">Captions</h1>
          <p className="mt-4 text-red-600">
            Error loading captions: {error.message}
          </p>
        </main>
    );
  }

  const captions = (data ?? []) as Caption[];

  return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-4xl font-bold">
            Captions
          </h1>

          <p className="mb-8 text-gray-600">
            Captions loaded from Supabase
          </p>

          <div className="space-y-4">
            {captions.map((caption) => (
                <div
                    key={caption.id}
                    className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <p className="text-lg">
                    {caption.caption_text}
                  </p>
                </div>
            ))}
          </div>

          {captions.length === 0 && (
              <p className="text-gray-500">
                No captions found.
              </p>
          )}
        </div>
      </main>
  );
}