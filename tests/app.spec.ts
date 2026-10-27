import { expect, test, type BrowserContext } from "@playwright/test";
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

async function signIn(context: BrowserContext, user: { id: string; email: string }) {
  await context.addCookies([{ ...sessionCookie(user), domain: "localhost", path: "/" }]);
}

test.describe("signed out", () => {
  test("home page shows the hero, scoreboard, challenge and feed", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Let's see who's");
    await expect(page.getByText("the scoreboard · all time")).toBeVisible();
    await expect(page.getByRole("link", { name: /Let's make something iconic/ })).toHaveAttribute("href", "/login?next=/create");
    await expect(page.getByText("today's challenge").first()).toBeVisible();
    expect(await page.locator("article").count()).toBeGreaterThan(5);
    await page.getByRole("link", { name: "🔥 Top this week" }).click();
    await expect(page).toHaveURL(/sort=top/);
    await expect(page.getByRole("heading", { name: /Top this week/ })).toBeVisible();
  });

  test("Human or AI? game works without an account", async ({ page }) => {
    await page.goto("/");
    const game = page.locator("#guess");
    await game.getByRole("button", { name: /Human/ }).click();
    await expect(game.getByText(/called it|fooled you/)).toBeVisible();
    await expect(game.getByText("1/1 right").or(game.getByText("0/1 right"))).toBeVisible();
    await game.getByRole("button", { name: "Next caption →" }).click();
    await expect(game.getByRole("button", { name: /AI/ })).toBeVisible();
  });

  test("challenge, post and surprise pages render; voting asks you to sign in", async ({ page }) => {
    await page.goto("/challenge");
    await expect(page.getByRole("heading", { name: /leaderboard/ })).toBeVisible();
    await page.goto("/surprise");
    await expect(page).toHaveURL(/surprise\?id=/);
    await expect(page.locator("article")).toHaveCount(1);
    await page.getByRole("link", { name: "Sign in to vote" }).first().click();
    await expect(page).toHaveURL(/\/login\?next=%2Fsurprise/);
  });

  test("the Daily Drop features today's library photo, never tomorrow's", async ({ page }) => {
    await page.goto("/challenge");
    await expect(page.getByRole("img", { name: "Students sitting on snowy Low Steps in puffer jackets" })).toBeVisible();
    await expect(page.getByText("📍 Low Steps, first snow")).toBeVisible();
    await expect(page.getByRole("link", { name: "✨ Meme today's drop" })).toHaveAttribute("href", /\/login\?next=%2Fcreate%3Fimage%3Df0000000/);
    await expect(page.locator("body")).not.toContainText("Tomorrow's surprise");
  });

  test("Surprise Me: fresh-photo mode rolls released library images only", async ({ page }) => {
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      await page.goto("/surprise?mode=fresh");
      await expect(page).toHaveURL(/mode=fresh&id=f0000000/);
      seen.add(new URL(page.url()).searchParams.get("id")!);
      await expect(page.getByRole("link", { name: "✨ Make it a meme" })).toBeVisible();
    }
    expect(seen.has("f0000000-0000-4000-8000-000000000004")).toBe(false); // tomorrow's drop
    // Asking for the unreleased one by id shows nothing.
    await page.goto("/surprise?mode=fresh&id=f0000000-0000-4000-8000-000000000004");
    await expect(page.getByText("The photo library is empty.")).toBeVisible();
  });

  test("finished battles show the final result; today's don't", async ({ page }) => {
    const [past] = await sql<{ id: string }>(
      `select g.id from public.generations g where g.challenge_date < (now() at time zone 'America/New_York')::date
         and exists (select 1 from public.captions c where c.generation_id = g.id and c.author_type = 'human')
       order by g.created_at desc limit 1`
    );
    await page.goto(`/g/${past.id}`);
    await expect(page.getByLabel("Final result")).toBeVisible();
    await expect(page.getByLabel("Final result")).toContainText(/Humans win|Gemini took it|Dead heat/);
    const today = await sql<{ id: string }>(`select id from public.generations where challenge_date = (now() at time zone 'America/New_York')::date limit 1`);
    if (today.length) {
      await page.goto(`/g/${today[0].id}`);
      await expect(page.getByLabel("Final result")).toHaveCount(0);
    }
  });

  test("the photo wall lays out every post as a tile", async ({ page }) => {
    await page.goto("/?view=wall");
    await expect(page.locator("#feed article")).toHaveCount(0);
    expect(await page.locator('#feed a[href^="/g/"]').count()).toBeGreaterThan(5);
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
    for (const path of ["/create", "/me", "/profile"]) {
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
    // A post Riley hasn't voted on anything in yet.
    const [target] = await sql<{ id: string; generation_id: string }>(
      `select c.id, c.generation_id from public.captions c
       where not exists (select 1 from public.caption_votes v where v.user_id = $1 and v.caption_id = c.id)
         and c.user_id <> $1 order by c.id limit 1`,
      [REGULAR_ID]
    );
    await page.goto(`/g/${target.generation_id}`);
    const [{ text }] = await sql<{ text: string }>(`select text from public.captions where id = $1`, [target.id]);
    const row = page.locator("li").filter({ hasText: text }).first();
    await expect(row.getByText("👀 human or AI?")).toBeVisible();
    await row.getByRole("button", { name: "Upvote" }).click();
    await expect(row.getByText(/🤖 Gemini|🧑‍🎓/)).toBeVisible();
    await expect(row.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
    const votes = await sql(`select vote from public.caption_votes where user_id = $1 and caption_id = $2`, [REGULAR_ID, target.id]);
    expect(votes).toEqual([{ vote: 1 }]);

    // Clicking again removes the vote.
    await row.getByRole("button", { name: "Upvote" }).click();
    await expect(row.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await sql(`select 1 from public.caption_votes where user_id = $1 and caption_id = $2`, [REGULAR_ID, target.id])).length).toBe(0);
  });

  test("add, edit and delete your own caption (with the confirm dialog)", async ({ page, context }) => {
    await signIn(context, USERS[5]);
    const postId = "c0000000-0000-4000-8000-000000000020";
    await page.goto(`/g/${postId}`);
    const text = `e2e caption ${Date.now()}`;
    await page.getByPlaceholder("your caption goes here…").fill(text);
    await page.getByRole("button", { name: "Post", exact: true }).click();
    await expect(page.getByText(/you're in the ring/)).toBeVisible();
    await page.reload();
    const row = page.locator("li", { hasText: text });
    await expect(row.getByText("🧑‍🎓 you")).toBeVisible();

    await row.getByRole("button", { name: "✏️ Edit" }).click();
    await row.getByRole("textbox", { name: "Edit your caption" }).fill(`${text} (edited)`);
    await row.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(`${text} (edited)`)).toBeVisible();

    const edited = page.locator("li", { hasText: `${text} (edited)` });
    await edited.getByRole("button", { name: "🗑️ Delete" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Delete your caption?" })).toBeVisible();
    await dialog.getByRole("button", { name: "Keep it" }).click();
    await expect(edited).toBeVisible();
    await edited.getByRole("button", { name: "🗑️ Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete caption" }).click();
    await expect(page.getByText(`${text} (edited)`)).toHaveCount(0);
    expect((await sql(`select 1 from public.captions where text like $1`, [`${text}%`])).length).toBe(0);
  });

  test("Your Meme Era: era headline and achievements reflect real activity", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.goto("/me");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("era");
    const firstDrop = page.locator("li", { hasText: "First drop" });
    await expect(firstDrop).toContainText("✓ unlocked"); // Maya has posts
    const [{ votes }] = await sql<{ votes: number }>(`select count(*) votes from public.caption_votes where user_id = $1`, [MAYA.id]);
    const ballot = page.locator("li", { hasText: "Ballot box" });
    await expect(ballot).toContainText(Number(votes) >= 25 ? "✓ unlocked" : `${votes}/25`);

    // Someone who has never posted or captioned hasn't unlocked those.
    await context.clearCookies();
    await signIn(context, USERS[1]);
    await page.goto("/me");
    await expect(page.getByText("Era loading…")).toBeVisible();
    for (const name of ["First drop", "In the ring", "Beat the machine", "Range"]) {
      await expect(page.locator("li", { hasText: name })).not.toContainText("✓ unlocked");
    }
  });

  test("My Posts: stats, tabs, and deleting your own post after confirming", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.goto("/me");
    const [{ n }] = await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [MAYA.id]);
    await expect(page.getByText(`📸 My photos (${n})`)).toBeVisible();
    await page.getByRole("link", { name: /My captions/ }).click();
    await expect(page).toHaveURL(/tab=captions/);
    await page.getByRole("link", { name: /My photos/ }).click();

    const article = page.locator("article").first();
    await article.getByRole("button", { name: "🗑️ Delete post" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Delete this post?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Delete post" }).click();
    await expect.poll(async () => (await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [MAYA.id]))[0].n).toBe(n - 1);
    // Someone else's post is untouched, and you can't see delete controls on it.
    await page.goto("/g/c0000000-0000-4000-8000-000000000004");
    await expect(page.getByRole("button", { name: /Delete post/ })).toHaveCount(0);
  });

  test("profile page saves your name", async ({ page, context }) => {
    await signIn(context, USERS[6]);
    await page.goto("/profile");
    await page.getByLabel("First name").fill("Sofia");
    await page.getByLabel("Last name").fill("Rossi-E2E");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved ✨")).toBeVisible();
    const [row] = await sql(`select last_name from public.profiles where id = $1`, [USERS[6].id]);
    expect(row.last_name).toBe("Rossi-E2E");
  });

  test("posting a photo gets Gemini captions", async ({ page, context }) => {
    test.skip(realGemini && !process.env.GEMINI_API_KEY, "GEMINI_API_KEY not set");
    await signIn(context, USERS[7]);
    const path = (await sql<{ image_path: string }>(`select image_path from public.generations limit 1`))[0].image_path;
    const png = Buffer.from(await (await fetch(`${MOCK}/storage/v1/object/public/generations/${path}`)).arrayBuffer());
    await page.goto("/create");
    await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: png });
    await page.getByRole("textbox", { name: /context/i }).fill("an abstract gradient");
    await page.getByRole("radio", { name: /Chronically online/ }).click();
    await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
    await expect(page.getByRole("status")).toContainText("Looking very closely");
    await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}\?new=1$/, { timeout: 70_000 });
    await expect(page.getByText("fresh out the oven")).toBeVisible();
    await expect(page.getByText("✨ your post")).toBeVisible();
    expect(await page.locator("li").filter({ hasText: "🤖 Gemini" }).count()).toBeGreaterThan(0);
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
      await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: await samplePng() });
      await page.getByRole("textbox", { name: /context/i }).fill("2am in Butler");
      await page.getByRole("radio", { name: /Columbia core/ }).click();
      await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
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
      await expect(page.locator("li").filter({ hasText: "🤖 Gemini" })).toHaveCount(4);
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
      await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: await samplePng() });
      await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
      const alert = page.locator("main").getByRole("alert");
      await expect(alert).toContainText("hit its usage limit");
      await expect(alert).toContainText("Your photo wasn't posted");
      await expect(alert).toContainText("you can still caption and vote");
      await expect(page).toHaveURL(/\/create$/);
      expect((await geminiCalls()).length - callsBefore).toBe(1); // a quota error isn't retried
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
      await page.getByPlaceholder("your caption goes here…").fill(text);
      await page.getByRole("button", { name: "Post", exact: true }).click();
      await expect(page.getByText(/you're in the ring/)).toBeVisible();
      const [target] = await sql<{ text: string }>(
        `select c.text from public.captions c where c.generation_id = $1 and c.user_id <> $2
           and not exists (select 1 from public.caption_votes v where v.caption_id = c.id and v.user_id = $2) limit 1`,
        [post, USERS[11].id]
      );
      const row = page.locator("li").filter({ hasText: target.text });
      await row.getByRole("button", { name: "Upvote" }).click();
      await expect(row.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
      for (const path of ["/", "/challenge", "/surprise", "/me"]) expect((await page.goto(path))?.status(), path).toBe(200);
    } finally {
      await gemini("ok");
    }
  });

  test("Gemini overloaded: retried, then a clear 'try again in a minute' message", async ({ page, context }) => {
    test.skip(realGemini, "uses the Gemini stand-in");
    await signIn(context, USERS[11]);
    await gemini("overloaded");
    try {
      const callsBefore = (await geminiCalls()).length;
      await page.goto("/create");
      await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: await samplePng() });
      await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
      await expect(page.locator("main").getByRole("alert")).toContainText("overloaded right now", { timeout: 30_000 });
      expect((await geminiCalls()).length - callsBefore).toBe(3); // first try + 2 retries
    } finally {
      await gemini("ok");
    }
  });

  test("when the model can't run, the post fails cleanly and the run is logged", async ({ page, context }) => {
    await signIn(context, USERS[9]);
    await sql(`update public.llm_providers set api_key_env_var = 'MISSING_TEST_API_KEY' where slug = 'google-gemini'`);
    try {
      const [{ n: before }] = await sql<{ n: number }>(`select count(*) n from public.generations where user_id = $1`, [USERS[9].id]);
      await page.goto("/create?image=f0000000-0000-4000-8000-000000000003");
      await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
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
    await page.goto("/challenge");
    await page.getByRole("link", { name: "✨ Meme today's drop" }).click();
    await expect(page).toHaveURL(/\/create\?image=/);
    await expect(page.getByRole("radio", { name: "Low Steps, first snow (today's drop)" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
    await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}\?new=1$/, { timeout: 70_000 });
    const id = page.url().match(/g\/([0-9a-f-]{36})/)![1];
    const [post] = await sql<{ source_image_id: string; image_path: string }>(`select source_image_id, image_path from public.generations where id = $1`, [id]);
    expect(post.source_image_id).toBe("f0000000-0000-4000-8000-000000000001");
    expect(post.image_path.startsWith(`${USERS[8].id}/`)).toBe(true); // copied into the poster's own folder
  });

  test("no horizontal scrolling on a phone", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.setViewportSize({ width: 375, height: 800 });
    for (const path of ["/", "/?view=wall", "/challenge", "/create", "/me", "/me?tab=captions", "/profile", "/surprise", "/surprise?mode=fresh", "/login", "/g/c0000000-0000-4000-8000-000000000004"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
