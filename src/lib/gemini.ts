const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  modelVersion?: string;
  error?: { message?: string };
};

// Sends an image plus a text prompt to Gemini and returns the captions it
// writes. Uses structured output so the response is always a JSON array.
export async function generateCaptionsWithGemini({
  image,
  mimeType,
  prompt,
}: {
  image: ArrayBuffer;
  mimeType: string;
  prompt: string;
}): Promise<{ captions: string[]; model: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: Buffer.from(image).toString("base64"),
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 1,
          responseMimeType: "application/json",
          responseSchema: { type: "ARRAY", items: { type: "STRING" } },
        },
      }),
    }
  );

  const body = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Gemini returned ${response.status}`);
  }

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no captions.");
  }

  const parsed: unknown = JSON.parse(text);
  const captions = (Array.isArray(parsed) ? parsed : [])
    .filter((caption): caption is string => typeof caption === "string")
    .map((caption) => caption.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 4);

  if (captions.length === 0) {
    throw new Error("Gemini returned no captions.");
  }

  return { captions, model: body.modelVersion ?? GEMINI_MODEL };
}
