// Shared copy and config for the caption game: the voices users can pick
// and the rotating daily photo prompt.

export const VIBES = {
  midwest: {
    label: "Midwest kid in NYC",
    description:
      "a polite, earnest Midwesterner who just moved to New York and is equal parts amazed and mildly terrified by it — references to Ope, casseroles, Target, driving everywhere, and people actually saying hi back home",
  },
  online: {
    label: "Chronically online",
    description:
      "a chronically online Gen Z college student — current internet slang, lowercase, deadpan, the energy of a viral TikTok comment or a quote tweet",
  },
  columbia: {
    label: "Columbia core",
    description:
      "a Columbia College student steeped in campus life — references to the Core Curriculum, Lit Hum, Butler Library at 3am, Low Steps, John Jay dining, Ferris Booth, the 1 train, Morningside Heights, and Barnard",
  },
  newyorker: {
    label: "Jaded New Yorker",
    description:
      "a lifelong New Yorker who has seen it all and is unimpressed by everything — dry, blunt, a little rude, references to bodegas, rats, rent, and tourists stopping in the middle of the sidewalk",
  },
} as const;

export type Vibe = keyof typeof VIBES;

export function isVibe(value: unknown): value is Vibe {
  return typeof value === "string" && value in VIBES;
}

const DAILY_PROMPTS = [
  "Your dining hall plate. No judgment.",
  "The view from your dorm window",
  "Something only a New Yorker would walk past",
  "Your subway car right now",
  "Butler at an unreasonable hour",
  "A bodega cat, or the closest thing to one",
  "Low Steps on a sunny day",
  "Something that would never happen back home",
  "Your desk during midterms",
  "The weirdest thing you saw this weekend",
  "A coffee that cost way too much",
  "The laundry room situation",
  "A rat. Respectfully.",
  "Your weekend adventure, in one photo",
];

// The prompt changes at midnight New York time, so everyone on campus sees
// the same one on the same day.
export function getDailyPrompt(date = new Date()) {
  const nyDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(date);
  const dayNumber = Math.floor(Date.parse(nyDate) / 86_400_000);
  return DAILY_PROMPTS[dayNumber % DAILY_PROMPTS.length];
}

export function buildCaptionPrompt({
  vibe,
  context,
  dailyPrompt,
}: {
  vibe: Vibe;
  context: string | null;
  dailyPrompt: string;
}) {
  return [
    "You write captions for photos posted by Columbia University students on a caption-voting app. The funniest captions get upvoted.",
    `Voice: ${VIBES[vibe].description}.`,
    context ? `The poster added this context: "${context}"` : null,
    `Today's photo prompt is "${dailyPrompt}". Lean into it if the photo fits, but don't force it.`,
    "Write 4 different captions for this photo. Each one must be under 140 characters, refer to something actually in the photo, and take a different comedic angle. Be funny, not mean: never mock a real person's appearance. No hashtags.",
    "Return only a JSON array of 4 strings.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
