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

// The emoji shown next to each voice in the UI.
export const VIBE_EMOJI: Record<string, string> = {
  midwest: "🌽",
  online: "📱",
  columbia: "🦁",
  newyorker: "🗽",
};

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

// Human captions are capped well below the 300-character AI limit; the
// database allows up to 200.
export const HUMAN_CAPTION_MAX = 150;

// Longest description a user can give for an AI-generated photo.
export const IMAGE_PROMPT_MAX = 200;

// Ideas for the "Generate with AI" photo option.
export const IMAGE_PROMPT_IDEAS = [
  "A raccoon pulling an all-nighter in Butler Library",
  "Alma Mater statue wearing a giant puffer jacket",
  "A pigeon cutting the line at Joe Coffee",
  "Low Steps covered in rubber ducks",
  "A squirrel giving a Lit Hum seminar",
  "The 1 train full of golden retrievers",
];

// The New York calendar day ("YYYY-MM-DD") for a moment in time. The daily
// challenge rolls over at midnight New York time, so everyone on campus is
// on the same day. Matches generations.challenge_date in the database.
export function getChallengeDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
  }).format(date);
}

// The challenge day `days` away from `day` (negative for earlier days).
export function shiftDay(day: string, days: number) {
  return new Date(Date.parse(day) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// The photo prompt for a challenge day; defaults to today.
export function getDailyPrompt(day = getChallengeDate()) {
  const dayNumber = Math.floor(Date.parse(day) / 86_400_000);
  return DAILY_PROMPTS[dayNumber % DAILY_PROMPTS.length];
}

// Milliseconds until the next challenge starts (midnight New York time).
export function msUntilNextChallenge(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(now)
      .map((part) => [part.type, Number(part.value)])
  );
  const elapsed = (parts.hour * 3600 + parts.minute * 60 + parts.second) * 1000;
  return 86_400_000 - elapsed;
}

export function buildCaptionPrompt({
  vibe,
  context,
  dailyPrompt,
  imagePrompt = null,
}: {
  vibe: Vibe;
  context: string | null;
  dailyPrompt: string;
  // Set when the photo itself was AI-generated from this description.
  imagePrompt?: string | null;
}) {
  return [
    "You write captions for photos posted by Columbia University students on a caption-voting app. The funniest captions get upvoted.",
    `Voice: ${VIBES[vibe].description}.`,
    context ? `The poster added this context: "${context}"` : null,
    imagePrompt
      ? `This image was AI-generated from the description "${imagePrompt}". Caption it as if it were a real photo.`
      : null,
    `Today's photo prompt is "${dailyPrompt}". Lean into it if the photo fits, but don't force it.`,
    "Write 4 different captions for this photo. Each one must be under 140 characters, refer to something actually in the photo, and take a different comedic angle. Be funny, not mean: never mock a real person's appearance. No hashtags. Your captions will compete head-to-head against captions written by real students, so make them sound like something a student would actually post.",
    "Return only a JSON array of 4 strings.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
