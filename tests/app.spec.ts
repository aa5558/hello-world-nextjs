import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { sessionCookie } from "../../morningside-memes-admin/tests/mock/session.mjs";
import { REGULAR_ID, USERS } from "../../morningside-memes-admin/tests/mock/seed.mjs";
import { buildCaptionPrompt, getDailyPrompt } from "../src/lib/captions";

const MOCK = "http://localhost:54399";
const MAYA = USERS[2]; // owns several seeded posts

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(`${MOCK}/__debug/query`, { method: "POST", body: JSON.stringify({ sql: query, params }) });
  return res.json();
}

type GeminiCall = { model: string; prompt: string; image: boolean; config: { temperature?: number; responseMimeType?: string }; mode: string };

const realGemini = process.env.REAL_GEMINI === "1";
async function gemini(mode: "ok" | "quota" | "overloaded") {
  await fetch(`${MOCK}/__debug/gemini`, { method: "POST", body: JSON.stringify({ mode }) });
}
async function geminiCalls(): Promise<GeminiCall[]> {
  return (await fetch(`${MOCK}/__debug/gemini-calls`)).json();
}
async function samplePng() {
  const path = (await sql<{ image_path: string }>(`select image_path from public.generations limit 1`))[0].image_path;
  return Buffer.from(await (await fetch(`${MOCK}/storage/v1/object/public/generations/${path}`)).arrayBuffer());
}

// Walks the step-by-step Create flow: photo -> vibe -> context -> generate.
async function studio(page: Page, opts: { file?: Buffer; vibe?: RegExp; context?: string } = {}) {
  if (opts.file) {
    await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: opts.file });
  } else {
    await page.getByRole("button", { name: /^Next/ }).click();
  }
  await page.getByRole("radio", { name: opts.vibe ?? /Columbia core/ }).click();
  if (opts.context) await page.getByRole("textbox", { name: /context/i }).fill(opts.context);
  await page.getByRole("button", { name: /^(Next|Skip)/ }).click();
  await page.getByRole("button", { name: /Make it funny/i }).click();
}

async function signIn(context: BrowserContext, user: { id: string; email: string }) {
  await context.addCookies([{ ...sessionCookie(user), domain: "localhost", path: "/" }]);
}

test.describe("signed out", () => {
  test("the entrance: CAPTION WARS, ENTER THE ARENA, the gloves, then the Studio or the Arena", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Caption");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Wars");
    await expect(page.getByText("May the funniest caption win.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Places" })).toHaveCount(0);
    await page.getByRole("button", { name: /Enter the arena/i }).click();
    await expect(page.getByRole("link", { name: /The Studio/ })).toHaveAttribute("href", "/login?next=/create");
    const more = page.getByRole("navigation", { name: "More" });
    await expect(more.getByRole("link", { name: "explore" })).toHaveAttribute("href", "/explore");
    await expect(more.getByRole("link", { name: "results" })).toHaveAttribute("href", "/results");
    await expect(more.getByRole("link", { name: "you" })).toHaveAttribute("href", "/login?next=/you");
    await page.getByRole("link", { name: /The Arena/ }).click();
    await expect(page).toHaveURL(/\/play/);
    await expect(page.getByRole("heading", { name: /Which one.s funnier/ })).toBeVisible();
    // The wordmark always returns to the two entrances.
    await page.getByRole("link", { name: "Morningside Memes, home" }).click();
    await expect(page.getByRole("link", { name: /The Arena/ })).toBeVisible();
  });

  test("places: five words reach every part of the app", async ({ page }) => {
    await page.goto("/play");
    await page.getByRole("button", { name: "Places" }).click();
    const places = page.getByRole("dialog", { name: "Places" });
    for (const word of ["Create", "Play", "Explore", "Results", "You"]) {
      await expect(places.getByRole("link", { name: new RegExp(`^${word}`) })).toBeVisible();
    }
    await places.getByRole("link", { name: /^Results/ }).click();
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByRole("dialog", { name: "Places" })).toHaveCount(0);
  });

  test("old addresses land on their new screens", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/explore/);
    await page.goto("/feed?sort=top");
    await expect(page).toHaveURL(/\/explore\?sort=top/);
    await page.goto("/challenge");
    await expect(page).toHaveURL(/\/results$/);
    await page.goto("/surprise");
    await expect(page).toHaveURL(/\/play\?mode=turn/);
  });

  test("Explore: one meme at a time, next/previous, keyboard, the overview, and sorting", async ({ page }) => {
    await page.goto("/explore");
    const photo = page.locator("figure img").first();
    const first = await photo.getAttribute("src");
    await expect(page.getByRole("list", { name: "Captions on this meme" })).toBeVisible();
    await page.getByRole("button", { name: "Next meme" }).click();
    await expect(page.locator("figure img").first()).not.toHaveAttribute("src", first!);
    await expect(page).toHaveURL(/\/explore\?id=/);
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("figure img").first()).toHaveAttribute("src", first!);
    // The overview (the old photo wall) shows every meme.
    await page.getByRole("button", { name: /^1 \/ \d+$/ }).click();
    const all = page.getByRole("dialog", { name: "All memes" });
    expect(await all.getByRole("button").count()).toBeGreaterThan(5);
    await all.getByRole("button", { name: "Close" }).click();
    await page.getByRole("link", { name: "top this week" }).click();
    await expect(page).toHaveURL(/sort=top/);
    // Voting needs an account.
    await page.goto("/explore");
    await page.getByRole("list", { name: "Captions on this meme" }).getByRole("button", { name: "Upvote" }).first().click();
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test("Human or AI? is a Play mode that works without an account", async ({ page }) => {
    await page.goto("/play?mode=guess");
    await expect(page.getByRole("heading", { name: "Human or AI?" })).toBeVisible();
    await page.getByRole("button", { name: "Human", exact: true }).click();
    await expect(page.getByText(/Called it\.|Fooled you\./).first()).toBeVisible();
    await expect(page.getByText(/^[01]\/1 right$/)).toBeVisible();
    await page.getByRole("button", { name: /Again/ }).click();
    await expect(page.getByRole("button", { name: "AI", exact: true })).toBeVisible();
  });

  test("Open mic (the random-battle Surprise) shows a posted photo and asks you to sign in to write", async ({ page }) => {
    await page.goto("/play?mode=turn");
    await expect(page.getByRole("heading", { name: "Open mic." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in/ }).last()).toHaveAttribute("href", /\/login\?next=/);
  });

  test("Results: a step-by-step reveal of today, the top captions, yesterday and Humans vs AI", async ({ page }) => {
    await page.goto("/results");
    await expect(page.getByRole("heading", { name: "Want to know who's winning?" })).toBeVisible();
    await page.getByRole("button", { name: /Show me/ }).click();
    await expect(page.getByRole("heading", { name: getDailyPrompt() })).toBeVisible();
    await page.getByRole("button", { name: /Who's on top/ }).click();
    await expect(
      page.getByRole("list", { name: "Today's top captions" }).or(page.getByRole("heading", { name: "Nobody's voted yet." }))
    ).toBeVisible();
    await page.getByRole("button", { name: /And yesterday/ }).click();
    await expect(page.getByText(/Yesterday.s winner|No winner yesterday/).first()).toBeVisible();
    await page.getByRole("button", { name: /Humans vs AI/ }).click();
    await expect(page.getByText("Humans vs AI · all time")).toBeVisible();
    // Back works, and so does skipping.
    await page.getByRole("button", { name: "← back" }).click();
    await expect(page.getByText(/Yesterday.s winner|No winner yesterday/).first()).toBeVisible();
    await page.getByRole("button", { name: "skip to the end" }).click();
    await expect(page.getByText("Humans vs AI · all time")).toBeVisible();
  });

  test("the Daily Drop features today's library photo, never tomorrow's", async ({ page }) => {
    await page.goto("/results");
    await page.getByRole("button", { name: /Show me/ }).click();
    await expect(page.getByRole("img", { name: "Students sitting on snowy Low Steps in puffer jackets" })).toBeVisible();
    await expect(page.getByRole("link", { name: "make one with today's photo" })).toHaveAttribute("href", /\/login\?next=%2Fcreate%3Fimage%3Df0000000/);
    await expect(page.locator("body")).not.toContainText("Tomorrow's surprise");
  });

  test("finished battles show the final result; today's don't", async ({ page }) => {
    const [past] = await sql<{ id: string }>(
      `select g.id from public.generations g where g.challenge_date < (now() at time zone 'America/New_York')::date
         and exists (select 1 from public.captions c where c.generation_id = g.id and c.author_type = 'human')
       order by g.created_at desc limit 1`
    );
    await page.goto(`/g/${past.id}`);
    await expect(page.getByLabel("Final result")).toBeVisible();
    await expect(page.getByLabel("Final result")).toContainText(/humans won|the AI took it|dead heat|no humans showed up/);
    const today = await sql<{ id: string }>(`select id from public.generations where challenge_date = (now() at time zone 'America/New_York')::date limit 1`);
    if (today.length) {
      await page.goto(`/g/${today[0].id}`);
      await expect(page.getByLabel("Final result")).toHaveCount(0);
    }
  });

  test("login explains the signup gate, and a blocked signup gets a clear message", async ({ page }) => {
    await page.goto("/auth/callback?error=server_error&error_description=Database+error+saving+new+user");
    await expect(page).toHaveURL(/\/login\?error=signup_blocked/);
    await expect(page.locator("main").getByRole("alert")).toContainText("couldn't create an account");

    await sql(`insert into public.allowed_signup_domains (domain) values ('columbia.edu'), ('barnard.edu')`);
    await sql(`update public.signup_settings set restrict_signups = true`);
    try {
      await page.goto("/login");
      await expect(page.getByText(/Use your @barnard\.edu or @columbia\.edu Google account/)).toBeVisible();
      await page.goto("/login?error=signup_blocked");
      await expect(page.locator("main").getByRole("alert")).toContainText("limited to @barnard.edu or @columbia.edu emails");
    } finally {
      await sql(`update public.signup_settings set restrict_signups = false`);
      await sql(`delete from public.allowed_signup_domains`);
    }
  });

  test("private pages redirect to login", async ({ request }) => {
    for (const path of ["/create", "/me", "/profile", "/you"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers().location, path).toContain(`/login?next=${encodeURIComponent(path)}`);
    }
  });

  test("login page ignores off-site ?next=", async ({ page }) => {
    await page.goto(`/login?next=${encodeURIComponent("//evil.example")}`);
    await expect(page.locator('input[name="next"]')).toHaveValue("/");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  });
});

test.describe("signed in", () => {
  test("voting reveals the author and updates the database", async ({ page, context }) => {
    const riley = USERS.find((u: { id: string }) => u.id === REGULAR_ID);
    await signIn(context, riley);
    // A caption Riley hasn't voted on yet.
    const [target] = await sql<{ id: string; generation_id: string }>(
      `select c.id, c.generation_id from public.captions c
       where not exists (select 1 from public.caption_votes v where v.user_id = $1 and v.caption_id = c.id)
         and c.user_id <> $1 order by c.id limit 1`,
      [REGULAR_ID]
    );
    await page.goto(`/g/${target.generation_id}`);
    const [{ text }] = await sql<{ text: string }>(`select text from public.captions where id = $1`, [target.id]);
    const row = page.locator("li").filter({ hasText: text }).first();
    await expect(row.getByText("human or AI? vote to find out")).toBeVisible();
    await row.getByRole("button", { name: "Upvote" }).click();
    await expect(row.getByText(/written by/)).toBeVisible();
    await expect(row.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
    const votes = await sql(`select vote from public.caption_votes where user_id = $1 and caption_id = $2`, [REGULAR_ID, target.id]);
    expect(votes).toEqual([{ vote: 1 }]);

    // Tapping again removes the vote.
    await row.getByRole("button", { name: "Upvote" }).click();
    await expect(row.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await sql(`select 1 from public.caption_votes where user_id = $1 and caption_id = $2`, [REGULAR_ID, target.id])).length).toBe(0);
  });

  test("write, edit and delete your own caption in Explore (with confirmation)", async ({ page, context }) => {
    await signIn(context, USERS[5]);
    const postId = "c0000000-0000-4000-8000-000000000020";
    await page.goto(`/g/${postId}`);
    const text = `e2e caption ${Date.now()}`;
    await page.getByRole("button", { name: "Write yours" }).click();
    await page.getByRole("textbox", { name: "Your caption" }).fill(text);
    await page.getByRole("button", { name: /Add my caption/ }).click();
    const row = page.locator("li", { hasText: text });
    await expect(row.getByText("yours")).toBeVisible();

    await row.getByRole("button", { name: "Your caption: edit or delete" }).click();
    await page.getByRole("dialog", { name: "Your caption" }).getByRole("button", { name: "Edit" }).click();
    await page.getByRole("dialog", { name: "Edit your caption" }).getByRole("textbox", { name: "Caption" }).fill(`${text} (edited)`);
    await page.getByRole("dialog", { name: "Edit your caption" }).getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(`${text} (edited)`)).toBeVisible();

    const edited = page.locator("li", { hasText: `${text} (edited)` });
    await edited.getByRole("button", { name: "Your caption: edit or delete" }).click();
    await page.getByRole("dialog", { name: "Your caption" }).getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("dialog", { name: "Delete your caption?" });
    await confirm.getByRole("button", { name: "Keep it" }).click();
    await expect(edited).toBeVisible();
    await edited.getByRole("button", { name: "Your caption: edit or delete" }).click();
    await page.getByRole("dialog", { name: "Your caption" }).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog", { name: "Delete your caption?" }).getByRole("button", { name: "Delete caption" }).click();
    await expect(page.getByText(`${text} (edited)`)).toHaveCount(0);
    expect((await sql(`select 1 from public.captions where text like $1`, [`${text}%`])).length).toBe(0);
  });

  test("Your turn: write a caption for a random posted photo", async ({ page, context }) => {
    await signIn(context, USERS[4]);
    await page.goto("/play?mode=turn");
    const text = `turn caption ${Date.now()}`;
    await page.getByRole("textbox", { name: "Your caption" }).fill(text);
    await page.getByRole("button", { name: /Add my caption/ }).click();
    await expect(page.getByRole("heading", { name: "It's in." })).toBeVisible();
    const rows = await sql(`select author_type from public.captions where text = $1`, [text]);
    expect(rows).toEqual([{ author_type: "human" }]);
    await page.getByRole("link", { name: /Again/ }).click();
    await expect(page).toHaveURL(/mode=turn&id=[0-9a-f-]{36}&seen=/);
  });

  test("Create: Surprise me only rolls released library photos", async ({ page, context }) => {
    await signIn(context, USERS[3]);
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      await page.goto("/create?surprise=1");
      const id = await page.locator('input[name="library_image"]').getAttribute("value");
      expect(id).toMatch(/^f0000000/);
      seen.add(id!);
      await expect(page.getByRole("heading", { name: "Surprise." })).toBeVisible();
    }
    expect(seen.has("f0000000-0000-4000-8000-000000000004")).toBe(false); // tomorrow's drop
    // Asking for the unreleased one by id doesn't select it.
    await page.goto("/create?image=f0000000-0000-4000-8000-000000000004");
    await expect(page.locator('input[name="library_image"]')).toHaveCount(0);
    // The old address still works.
    await page.goto("/surprise?mode=fresh");
    await expect(page).toHaveURL(/\/create\?surprise=1/);
  });

  test("You: era and achievements reflect real activity", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.goto("/you");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("era");
    await page.getByRole("navigation", { name: "You" }).getByRole("link", { name: "achievements" }).click();
    const firstDrop = page.locator("li", { hasText: "First drop" });
    await expect(firstDrop).toContainText("earned"); // Maya has posts
    const [{ votes }] = await sql<{ votes: number }>(`select count(*) votes from public.caption_votes where user_id = $1`, [MAYA.id]);
    await expect(page.locator("li", { hasText: "Ballot box" })).toContainText(Number(votes) >= 25 ? "earned" : `${votes}/25`);

    // Someone who has never posted or captioned hasn't unlocked those.
    await context.clearCookies();
    await signIn(context, USERS[1]);
    await page.goto("/you");
    await expect(page.getByText("Era loading…")).toBeVisible();
    await page.goto("/you?s=achievements");
    for (const name of ["First drop", "In the ring", "Beat the machine", "Range"]) {
      await expect(page.locator("li", { hasText: name })).not.toContainText("earned");
    }
    // The old address lands here.
    await page.goto("/me?tab=captions");
    await expect(page).toHaveURL(/\/you\?s=captions/);
  });

  test("You: your memes, one at a time, and deleting one after confirming", async ({ page, context }) => {
    await signIn(context, MAYA);
    const [{ n }] = await sql<{ n: number }>(`select count(*)::int n from public.generations where user_id = $1`, [MAYA.id]);
    await page.goto("/you?s=memes");
    await expect(page.getByRole("heading", { name: "Your memes" })).toBeVisible();
    await expect(page.getByRole("button", { name: `1 / ${n}` })).toBeVisible();
    await page.getByRole("button", { name: "··· your meme" }).click();
    await page.getByRole("dialog", { name: "Your meme" }).getByRole("button", { name: "Delete this meme" }).click();
    await page.getByRole("dialog", { name: "Delete this meme?" }).getByRole("button", { name: "Delete post" }).click();
    await expect.poll(async () => (await sql<{ n: number }>(`select count(*)::int n from public.generations where user_id = $1`, [MAYA.id]))[0].n).toBe(n - 1);
    await page.goto("/you?s=captions");
    await expect(page.getByRole("heading", { name: /Your captions|No captions yet\./ })).toBeVisible();
    // Someone else's post: no owner controls.
    await page.goto("/g/c0000000-0000-4000-8000-000000000004");
    await expect(page.getByRole("button", { name: "··· your meme" })).toHaveCount(0);
  });

  test("You: editing the context line of your own meme", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.goto("/you?s=memes");
    await page.getByRole("button", { name: "··· your meme" }).click();
    await page.getByRole("dialog", { name: "Your meme" }).getByRole("button", { name: "Edit the context line" }).click();
    const line = `e2e context ${Date.now()}`;
    await page.getByRole("dialog", { name: "Edit the context line" }).getByRole("textbox", { name: "Context" }).fill(line);
    await page.getByRole("dialog", { name: "Edit the context line" }).getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(line).first()).toBeVisible();
    const rows = await sql(`select 1 from public.generations where user_id = $1 and context = $2`, [MAYA.id, line]);
    expect(rows.length).toBe(1);
  });

  test("account settings save your name (and /profile still works)", async ({ page, context }) => {
    await signIn(context, USERS[6]);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/you\?s=account/);
    await page.getByLabel("First name").fill("Sofia");
    await page.getByLabel("Last name").fill("Rossi-E2E");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    const [row] = await sql(`select last_name from public.profiles where id = $1`, [USERS[6].id]);
    expect(row.last_name).toBe("Rossi-E2E");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    // New accounts arrive with a welcome.
    await page.goto("/profile?welcome=1");
    await expect(page.getByRole("heading", { name: "Welcome in." })).toBeVisible();
  });

  test("posting a photo gets Gemini captions", async ({ page, context }) => {
    test.skip(realGemini && !process.env.GEMINI_API_KEY, "GEMINI_API_KEY not set");
    await signIn(context, USERS[7]);
    const path = (await sql<{ image_path: string }>(`select image_path from public.generations limit 1`))[0].image_path;
    const png = Buffer.from(await (await fetch(`${MOCK}/storage/v1/object/public/generations/${path}`)).arrayBuffer());
    await page.goto("/create");
    await studio(page, { file: png, vibe: /Chronically online/, context: "an abstract gradient" });
    await expect(page.getByRole("status")).toContainText("Looking very closely");
    await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}\?new=1$/, { timeout: 70_000 });
    await expect(page.getByText("Your meme is live.")).toBeVisible();
    expect(await page.getByRole("list", { name: "Captions on your meme" }).getByRole("listitem").count()).toBeGreaterThan(0);
    await expect(page.getByRole("link", { name: /Take it to the arena/i })).toHaveAttribute("href", "/play");
    // The run was logged against a chain, with every model call, and linked
    // to the captions it wrote.
    const id = page.url().match(/g\/([0-9a-f-]{36})/)![1];
    const [run] = await sql<{ status: string; captions: number; calls: number; chain_slug: string }>(
      `select status, chain_slug, coalesce(array_length(caption_ids, 1), 0) captions,
              (select count(*) from public.llm_responses l where l.request_id = r.id and l.status = 'ok') calls
       from public.generation_requests r where generation_id = $1`,
      [id]
    );
    expect(run.status).toBe("succeeded");
    expect(["classic", "scene-scan", "writers-room"]).toContain(run.chain_slug);
    expect(run.calls).toBeGreaterThan(0);
    const [{ n }] = await sql<{ n: number }>(`select count(*) n from public.captions where generation_id = $1 and author_type = 'ai'`, [id]);
    expect(run.captions).toBe(Number(n));
  });

  test("Classic is the default and sends the original prompt, unchanged, in one call", async ({ page, context }) => {
    test.skip(realGemini, "inspects the Gemini stand-in");
    await signIn(context, USERS[10]);
    // With no active terms or examples, the Classic prompt must be the
    // pre-migration prompt word for word.
    await sql(`update public.terms set is_active = false`);
    await sql(`update public.ai_generation_examples set is_active = false`);
    try {
      const before = (await geminiCalls()).length;
      await page.goto("/create");
      await studio(page, { file: await samplePng(), context: "2am in Butler" });
      await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}\?new=1$/, { timeout: 30_000 });
      const calls = (await geminiCalls()).slice(before);
      expect(calls).toHaveLength(1);
      expect(calls[0].model).toBe("gemini-flash-latest");
      expect(calls[0].image).toBe(true);
      expect(calls[0].config).toMatchObject({ temperature: 1, responseMimeType: "application/json" });
      expect(calls[0].prompt).toBe(buildCaptionPrompt({ vibe: "columbia", context: "2am in Butler", dailyPrompt: getDailyPrompt() }));
      const id = page.url().match(/g\/([0-9a-f-]{36})/)![1];
      const [run] = await sql<{ chain_slug: string; status: string }>(`select chain_slug, status from public.generation_requests where generation_id = $1`, [id]);
      expect(run).toEqual({ chain_slug: "classic", status: "succeeded" });
      const [post] = await sql<{ prompt: string; model: string }>(`select prompt, model from public.generations where id = $1`, [id]);
      expect(post.prompt).toBe(calls[0].prompt);
      await expect(page.getByRole("list", { name: "Captions on your meme" }).getByRole("listitem")).toHaveCount(4);
    } finally {
      await sql(`update public.terms set is_active = true`);
      await sql(`update public.ai_generation_examples set is_active = true`);
    }
  });

  test("Gemini out of quota: a clear message, nothing half-posted, no retries, the rest of the app keeps working", async ({ page, context }) => {
    test.skip(realGemini, "uses the Gemini stand-in");
    await signIn(context, USERS[11]);
    await gemini("quota");
    try {
      const [{ n: before }] = await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [USERS[11].id]);
      const callsBefore = (await geminiCalls()).length;
      const objects = async () => (await sql(`select 1 from storage.objects where name like $1`, [`${USERS[11].id}/%`])).length;
      const objectsBefore = await objects();
      await page.goto("/create");
      await studio(page, { file: await samplePng() });
      const alert = page.locator("main").getByRole("alert");
      await expect(alert).toContainText("hit its usage limit");
      await expect(alert).toContainText("Your photo wasn't posted");
      await expect(alert).toContainText("you can still caption and vote");
      await expect(page).toHaveURL(/\/create$/);
      // Free-tier quotas are per model: each model is tried exactly once, none retried.
      const calls = (await geminiCalls()).slice(callsBefore);
      expect(calls.length).toBe(new Set(calls.map((c) => c.model)).size); // a quota error isn't retried
      const [{ n: after }] = await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [USERS[11].id]);
      expect(after).toBe(before);
      const [run] = await sql<{ status: string; http_status: number }>(
        `select r.status, l.http_status from public.generation_requests r join public.llm_responses l on l.request_id = r.id
         where r.user_id = $1 order by r.started_at desc limit 1`,
        [USERS[11].id]
      );
      expect(run).toEqual({ status: "failed", http_status: 429 });
      expect(await objects()).toBe(objectsBefore); // nothing uploaded

      // Captions, voting and browsing don't need Gemini.
      const post = "c0000000-0000-4000-8000-000000000006";
      await page.goto(`/g/${post}`);
      const text = `quota-proof caption ${Date.now()}`;
      await page.getByRole("button", { name: "Write yours" }).click();
      await page.getByRole("textbox", { name: "Your caption" }).fill(text);
      await page.getByRole("button", { name: /Add my caption/ }).click();
      await expect(page.locator("li", { hasText: text }).getByText("yours")).toBeVisible();
      const [target] = await sql<{ text: string }>(
        `select c.text from public.captions c where c.generation_id = $1 and c.user_id <> $2
           and not exists (select 1 from public.caption_votes v where v.caption_id = c.id and v.user_id = $2) limit 1`,
        [post, USERS[11].id]
      );
      const row = page.locator("li").filter({ hasText: target.text });
      await row.getByRole("button", { name: "Upvote" }).click();
      await expect(row.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
      for (const path of ["/", "/explore", "/results", "/play", "/you"]) {
        await page.goto(path);
        await expect(page.locator("main").first()).toBeVisible();
      }
    } finally {
      await gemini("ok");
    }
  });

  test("every Gemini model overloaded: bounded retries, then a clear 'try again' message and no post", async ({ page, context }) => {
    test.skip(realGemini, "uses the Gemini stand-in");
    await signIn(context, USERS[11]);
    await gemini("overloaded");
    try {
      const [{ n: postsBefore }] = await sql<{ n: number }>(`select count(*)::int n from public.generations where user_id = $1`, [USERS[11].id]);
      const callsBefore = (await geminiCalls()).length;
      await page.goto("/create");
      await studio(page, { file: await samplePng() });
      await expect(page.locator("main").getByRole("alert")).toContainText("overloaded, even after retrying", { timeout: 60_000 });
      const calls = (await geminiCalls()).slice(callsBefore);
      // Every callable model was tried, a bounded number of times.
      expect(new Set(calls.map((c) => c.model)).size).toBe(3);
      expect(calls.length).toBeLessThanOrEqual(9);
      const [{ n: postsAfter }] = await sql<{ n: number }>(`select count(*)::int n from public.generations where user_id = $1`, [USERS[11].id]);
      expect(postsAfter).toBe(postsBefore);
    } finally {
      await gemini("ok");
    }
  });

  test("the main model overloaded: captions come from a fallback model automatically", async ({ page, context }) => {
    test.skip(realGemini, "uses the Gemini stand-in");
    await signIn(context, USERS[10]);
    await fetch(`${MOCK}/__debug/gemini`, { method: "POST", body: JSON.stringify({ model: "gemini-flash-latest", mode: "overloaded" }) });
    try {
      await page.goto("/create");
      await studio(page, { file: await samplePng() });
      await page.waitForURL(/\/g\/[0-9a-f-]{36}\?new=1$/, { timeout: 60_000 });
      const postId = page.url().match(/\/g\/([0-9a-f-]{36})/)![1];
      const [run] = await sql<{ id: string; status: string; caption_ids: string[] }>(
        `select id, status, caption_ids from public.generation_requests where generation_id = $1`, [postId]);
      expect(run.status).toBe("succeeded");
      expect(run.caption_ids.length).toBe(4);
      const [call] = await sql<{ model_key: string; attempts: { model: string; outcome: string }[] }>(
        `select model_key, attempts from public.llm_responses where request_id = $1`, [run.id]);
      expect(call.model_key).not.toBe("gemini-flash-latest");
      expect(call.attempts[0]).toMatchObject({ model: "gemini-flash-latest", outcome: "busy" });
      expect(call.attempts.at(-1)!.outcome).toBe("ok");
      const [{ n }] = await sql<{ n: number }>(`select count(*)::int n from public.llm_responses where request_id = $1`, [run.id]);
      expect(n).toBe(1); // one logged row, however many attempts
      const [{ model }] = await sql<{ model: string }>(`select model from public.generations where id = $1`, [postId]);
      expect(model).toBe(call.model_key);
    } finally {
      await gemini("ok");
    }
  });

  test("submitting the same form twice can't create a second post", async ({ page, context }) => {
    await signIn(context, USERS[8]);
    // A post that this form submission already created.
    const [existing] = await sql<{ id: string }>(`select id from public.generations where user_id = $1 limit 1`, [USERS[8].id]);
    const [{ n: postsBefore }] = await sql<{ n: number }>(`select count(*)::int n from public.generations where user_id = $1`, [USERS[8].id]);
    const [{ n: runsBefore }] = await sql<{ n: number }>(`select count(*)::int n from public.generation_requests where user_id = $1`, [USERS[8].id]);
    const callsBefore = (await geminiCalls()).length;
    await page.goto("/create");
    await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: await samplePng() });
    await page.getByRole("radio", { name: /Columbia core/ }).click();
    await page.getByRole("button", { name: /^(Next|Skip)/ }).click();
    await expect(page.getByRole("button", { name: /Make it funny/i })).toBeEnabled();
    // Replay the id of a submission that already produced a post, right
    // before submitting (React re-renders reset the hidden field earlier).
    await page.locator("form").evaluate((form, id) => {
      (form.querySelector('input[name="submission_id"]') as HTMLInputElement).value = id;
      form.requestSubmit();
    }, existing.id);
    await page.waitForURL(new RegExp(`/g/${existing.id}\\?new=1$`));
    const [{ n: postsAfter }] = await sql<{ n: number }>(`select count(*)::int n from public.generations where user_id = $1`, [USERS[8].id]);
    const [{ n: runsAfter }] = await sql<{ n: number }>(`select count(*)::int n from public.generation_requests where user_id = $1`, [USERS[8].id]);
    expect(postsAfter).toBe(postsBefore);
    expect(runsAfter).toBe(runsBefore);
    expect((await geminiCalls()).length).toBe(callsBefore);
  });

  test("when the model can't run, the post fails cleanly and the run is logged", async ({ page, context }) => {
    await signIn(context, USERS[9]);
    await sql(`update public.llm_providers set api_key_env_var = 'MISSING_TEST_API_KEY' where slug = 'google-gemini'`);
    try {
      const [{ n: before }] = await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [USERS[9].id]);
      await page.goto("/create?image=f0000000-0000-4000-8000-000000000003");
      await studio(page);
      await expect(page.locator("main").getByRole("alert")).toContainText("The AI couldn't caption that one");
      await expect(page).toHaveURL(/\/create/);
      const [{ n: after }] = await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [USERS[9].id]);
      expect(after).toBe(before); // no half-made post
      const [run] = await sql<{ status: string; error_message: string; logged: string }>(
        `select status, error_message, (select error_message from public.llm_responses l where l.request_id = r.id) logged
         from public.generation_requests r where user_id = $1 order by started_at desc limit 1`,
        [USERS[9].id]
      );
      expect(run.status).toBe("failed");
      expect(run.logged).toContain("MISSING_TEST_API_KEY is not configured");
    } finally {
      await sql(`update public.llm_providers set api_key_env_var = 'GEMINI_API_KEY' where slug = 'google-gemini'`);
    }
  });

  test("posting from today's Daily Drop photo", async ({ page, context }) => {
    test.skip(realGemini && !process.env.GEMINI_API_KEY, "GEMINI_API_KEY not set");
    await signIn(context, USERS[8]);
    await page.goto("/results");
    await page.getByRole("button", { name: /Show me/ }).click();
    await page.getByRole("link", { name: "make one with today's photo" }).click();
    await expect(page).toHaveURL(/\/create\?image=/);
    await expect(page.locator('input[name="library_image"]')).toHaveValue("f0000000-0000-4000-8000-000000000001");
    await expect(page.getByText(/today's photo$/)).toBeVisible();
    await studio(page);
    await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}\?new=1$/, { timeout: 70_000 });
    const id = page.url().match(/g\/([0-9a-f-]{36})/)![1];
    const [post] = await sql<{ source_image_id: string; image_path: string }>(`select source_image_id, image_path from public.generations where id = $1`, [id]);
    expect(post.source_image_id).toBe("f0000000-0000-4000-8000-000000000001");
    expect(post.image_path.startsWith(`${USERS[8].id}/`)).toBe(true); // copied into the poster's own folder
  });

  test("no horizontal scrolling on a phone", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.setViewportSize({ width: 375, height: 800 });
    for (const path of ["/", "/?start=choose", "/play", "/play?mode=guess", "/play?mode=turn", "/explore", "/results", "/create", "/create?surprise=1", "/you", "/you?s=memes", "/you?s=captions", "/you?s=achievements", "/you?s=account", "/login", "/g/c0000000-0000-4000-8000-000000000004"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("play", () => {
  test("signed out: one photo, two blind captions, tapping asks you to sign in", async ({ page }) => {
    await page.goto("/play");
    await expect(page.getByRole("heading", { name: /Which one.s funnier/ })).toBeVisible();
    const picks = page.locator("main button[aria-pressed]");
    await expect(picks).toHaveCount(2);
    await expect(page.getByText(/Written by/)).toHaveCount(0);
    await picks.first().click();
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)play/);
  });

  test("signed in: picking upvotes it, reveals only that author, then Again?", async ({ page, context }) => {
    await signIn(context, USERS.find((u: { id: string }) => u.id === REGULAR_ID));
    await page.goto("/play");
    const picks = page.locator("main button[aria-pressed]");
    await expect(picks).toHaveCount(2);
    const captionId = await picks.first().getAttribute("data-caption-id");
    await picks.first().click();
    await expect(picks.first()).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/Written by/)).toHaveCount(1);
    const votes = await sql<{ vote: number }>(`select vote from public.caption_votes where user_id = $1 and caption_id = $2`, [REGULAR_ID, captionId]);
    expect(votes.map((v) => v.vote)).toEqual([1]);
    await page.getByRole("link", { name: /Again/ }).click();
    await expect(page).toHaveURL(/\/play\?seen=/);
    await expect(page.locator("main button[aria-pressed]").first()).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("accessibility basics", () => {
  test("the opening works with the keyboard alone", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Enter/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("link", { name: /The Arena/ })).toBeVisible();
    await page.getByRole("link", { name: /The Arena/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/play/);
  });

  test("every screen has one main heading and no unlabeled controls", async ({ page, context }) => {
    await signIn(context, MAYA);
    for (const path of ["/?start=choose", "/play", "/play?mode=guess", "/play?mode=turn", "/explore", "/results", "/create", "/you", "/you?s=memes", "/you?s=captions", "/you?s=achievements", "/you?s=account"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const report = await page.evaluate(() => {
        const visible = (el: Element) => !!(el as HTMLElement).offsetParent || getComputedStyle(el).position === "fixed";
        const h1s = [...document.querySelectorAll("h1")].filter(visible).length;
        const unlabeled = [...document.querySelectorAll("button, a[href]")]
          .filter(visible)
          .filter((el) => !el.closest("[aria-hidden='true']"))
          .filter((el) => !(el.getAttribute("aria-label") || (el.textContent ?? "").trim() || el.querySelector("img[alt]:not([alt=''])")))
          .map((el) => el.outerHTML.slice(0, 80));
        return { h1s, unlabeled };
      });
      expect(report.unlabeled, path).toEqual([]);
      expect(report.h1s, path).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("the world reacts", () => {
  test("sound is off by default, the switch works, and it is remembered", async ({ page }) => {
    await page.goto("/play");
    const toggle = page.getByRole("button", { name: "Sound off" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Sound on" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "Sound on" })).toBeVisible();
    await page.getByRole("button", { name: "Sound on" }).click();
    await expect(page.getByRole("button", { name: "Sound off" })).toBeVisible();
  });

  test("the entrances tilt toward the pointer and settle back", async ({ page }) => {
    await page.goto("/?start=choose");
    const studio = page.getByRole("link", { name: /The Studio/ });
    const tilt = studio.locator("xpath=..");
    const box = (await studio.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15);
    await expect.poll(async () => tilt.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--ry"))).not.toBe("0deg");
    expect(await tilt.getAttribute("data-active")).toBe("true");
    await page.mouse.move(5, 5);
    await expect.poll(async () => tilt.evaluate((el) => (el as HTMLElement).style.getPropertyValue("--ry"))).toBe("0deg");
  });

  test("with reduced motion: no door animation, no tilt, everything still works", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: /Enter/ }).click();
    await expect(page.getByRole("link", { name: /The Arena/ })).toBeVisible({ timeout: 1500 });
    const studio = page.getByRole("link", { name: /The Studio/ });
    const box = (await studio.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.9, box.y + 10);
    await page.mouse.move(box.x + box.width * 0.8, box.y + 20);
    expect(await studio.locator("xpath=..").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--ry"))).toBe("");
    await page.getByRole("link", { name: /The Arena/ }).click();
    await expect(page.getByRole("heading", { name: /Which one.s funnier/ })).toBeVisible();
    await context.close();
  });
});

test.describe("caption wars entrance", () => {
  test("one click, one entrance: double-clicking can't start it twice, and the arena works afterwards", async ({ page }) => {
    await page.goto("/");
    const enter = page.getByRole("button", { name: /Enter the arena/i });
    await enter.click();
    // A second click during the animation does nothing (the button is disabled).
    await expect(enter).toBeDisabled();
    await expect(page.locator(".entrance")).toHaveCount(1);
    await expect(page.locator(".entrance .entrance-glove")).toHaveCount(2);
    // The gloves clear and the arena is underneath, usable.
    await expect(page.locator(".entrance")).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByRole("link", { name: /The Studio/ })).toBeVisible();
    await page.getByRole("link", { name: /The Arena/ }).click();
    await expect(page).toHaveURL(/\/play/);
  });

  test("the gloves completely cover the screen before the arena is revealed (phone)", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.clock.install();
    await page.goto("/");
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 50);
    await page.getByRole("button", { name: /Enter the arena/i }).click();
    // Seek the CSS animations to the covered moment (1.8 s).
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = Math.max(0, 1800 - Number(a.effect?.getTiming().delay ?? 0));
      }
    });
    // The two halves (each solid leather by now) span the whole viewport.
    const covered = await page.evaluate(() => {
      const halves = [...document.querySelectorAll(".entrance-half")] as HTMLElement[];
      const [l, r] = halves.map((h) => h.getBoundingClientRect());
      const solid = halves.every((h) => getComputedStyle(h, "::before").opacity === "1");
      return solid && l.left <= 0 && r.right >= innerWidth && l.right >= r.left && l.top <= 0 && l.bottom >= innerHeight && r.top <= 0 && r.bottom >= innerHeight;
    });
    expect(covered).toBe(true);
    await context.close();
  });
});
