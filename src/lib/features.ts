// Feature switches read on the server.

// AI photo generation needs a paid Gemini plan (the free tier has no image
// quota), so it's off unless ENABLE_AI_PHOTOS=true. The code stays in place:
// set the env var to bring back the "Generate with AI" option.
export const AI_PHOTOS_ENABLED = process.env.ENABLE_AI_PHOTOS === "true";
