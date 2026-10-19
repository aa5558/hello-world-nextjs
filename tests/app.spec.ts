import { expect, test, type BrowserContext } from "@playwright/test";
import { sessionCookie } from "../../morningside-memes-admin/tests/mock/session.mjs";
import { REGULAR_ID, USERS } from "../../morningside-memes-admin/tests/mock/seed.mjs";

const MOCK = "http://localhost:54399";
const MAYA = USERS[2]; // owns several seeded posts

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(`${MOCK}/__debug/query`, { method: "POST", body: JSON.stringify({ sql: query, params }) });
  return res.json();
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
    test.skip(!process.env.GEMINI_API_KEY, "GEMINI_API_KEY not set");
    await signIn(context, USERS[7]);
    const path = (await sql<{ image_path: string }>(`select image_path from public.generations limit 1`))[0].image_path;
    const png = Buffer.from(await (await fetch(`${MOCK}/storage/v1/object/public/generations/${path}`)).arrayBuffer());
    await page.goto("/create");
    await page.locator('input[type="file"]').setInputFiles({ name: "p.png", mimeType: "image/png", buffer: png });
    await page.getByLabel(/Context/).fill("an abstract gradient");
    await page.getByText("Chronically online").click();
    await page.getByRole("button", { name: "Let the AI cook ✨" }).click();
    await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}$/, { timeout: 60_000 });
    await expect(page.getByText("✨ your post")).toBeVisible();
    expect(await page.locator("li").filter({ hasText: "🤖 Gemini" }).count()).toBeGreaterThan(0);
  });

  test("no horizontal scrolling on a phone", async ({ page, context }) => {
    await signIn(context, MAYA);
    await page.setViewportSize({ width: 375, height: 800 });
    for (const path of ["/", "/challenge", "/create", "/me", "/me?tab=captions", "/profile", "/surprise", "/login", "/g/c0000000-0000-4000-8000-000000000004"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});
