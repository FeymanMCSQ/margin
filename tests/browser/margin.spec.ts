import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const legacy = [
  {
    id: "ari",
    name: "Ari",
    asked: [0, 3, 12, 35],
    current: 17,
    created: 1000,
    updated: 2000,
  },
  {
    id: "sam",
    name: "Sam",
    asked: [1],
    current: 2,
    created: 1100,
    updated: 2200,
  },
];
async function seed(page: Page) {
  await page.goto("/");
  await page.evaluate((people) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("margin.conversations.v1", JSON.stringify(people));
    sessionStorage.setItem("margin.active.v1", "ari");
    history.replaceState(null, "", "/#talk/36");
  }, legacy);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ari", exact: true }),
  ).toBeVisible();
}
const prompt = (page: Page) =>
  page.getByRole("article", { name: "Current prompt" }).getByRole("heading");
async function stored(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("margin.conversations.v2")!),
  );
}
async function noAxeIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}

test("360px upgrade, original sets, quick resume, new-card actions and cross-profile isolation", async ({
  page,
}) => {
  await seed(page);
  await expect(prompt(page)).toHaveText(
    "Which memory is the most painful for you?",
  );
  expect((await stored(page)).people[0].asked).toEqual(legacy[0].asked);
  await page.getByRole("button", { name: "Set III", exact: false }).click();
  await expect(prompt(page)).toContainText("Each make three true statements");
  await page
    .getByRole("button", { name: "Conversation prompts", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Talk categories" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(prompt(page)).toHaveText(
    "Have you been to one of these before?",
  );
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(prompt(page)).toHaveText("How did you hear about this event?");
  expect((await stored(page)).people[0].usedPrompts).toEqual({});
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await expect(prompt(page)).toContainText("first time at this place");
  await page.getByRole("button", { name: "Mark used", exact: true }).click();
  expect((await stored(page)).people[0].usedPrompts["mgv2-003"]).toBeTruthy();
  expect(
    (await stored(page)).people[0].usedPrompts["mgv2-002"],
  ).toBeUndefined();
  await page.getByRole("button", { name: "← Previous", exact: true }).click();
  await expect(prompt(page)).toContainText("first time at this place");
  await expect(
    page.getByRole("button", { name: "Mark unused", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(prompt(page)).not.toContainText("first time at this place");
  await page
    .getByRole("navigation", { name: "Talk categories" })
    .getByRole("button", { name: "Discover", exact: true })
    .click();
  await page.locator(".topic-filter > summary").click();
  await page.getByLabel("Context or topic").selectOption("music");
  await expect(prompt(page)).toContainText("listening to on repeat");
  await page.reload();
  await expect(prompt(page)).toContainText("listening to on repeat");
  await page.locator(".topic-filter > summary").click();
  await page.getByLabel("Context or topic").selectOption("music");
  await page.getByRole("button", { name: "Mark used", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "That’s this collection for now." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await page
    .getByRole("button", { name: "Talk with Sam", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Conversation prompts", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Talk categories" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await expect(prompt(page)).toHaveText(
    "Have you been to one of these before?",
  );
  expect((await stored(page)).people[1].usedPrompts).toEqual({});
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await noAxeIssues(page);
  await page.screenshot({ path: ".dist/talk-mobile.png", fullPage: true });
});

test("plans support explicit states, decline suppression and manual reopening", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Plans", exact: true }).click();
  const first = await prompt(page).textContent();
  await page
    .getByRole("button", { name: "Use as a plan idea", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await noAxeIssues(page);
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("proposed");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await page.getByLabel(`State for ${first}`).selectOption("accepted");
  expect((await stored(page)).people[0].plans[0].state).toBe("accepted");
  await page.getByLabel(`State for ${first}`).selectOption("declined");
  await expect(prompt(page)).not.toHaveText(first!);
  await page.getByText("Past & set aside (1)", { exact: true }).click();
  await page
    .getByRole("button", { name: `Edit plan: ${first}`, exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("completed");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  expect((await stored(page)).people[0].plans[0].state).toBe("completed");
  await page.getByRole("button", { name: "+ Add idea", exact: true }).click();
  await page.getByLabel("Idea", { exact: true }).fill("Walk around the lake");
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await page
    .getByLabel("State for Walk around the lake")
    .selectOption("cancelled");
  expect((await stored(page)).people[0].plans[1].state).toBe("cancelled");
  await noAxeIssues(page);
  await page.screenshot({ path: ".dist/plans-mobile.png", fullPage: true });
});

test("profile editing, templates, import preview, export, focus and accessible people view", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New person", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Jo");
  await page.getByLabel("Interests", { exact: false }).fill("music, food");
  await page
    .getByLabel("Last discussed", { exact: false })
    .fill("Their show on Friday");
  await page
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Talk categories" })
    .getByRole("button", { name: "Reconnect", exact: true })
    .click();
  await expect(prompt(page)).toContainText("[event]");
  await expect(prompt(page)).not.toContainText("Friday");
  await page
    .getByRole("button", { name: "Options", exact: false })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const backup = { app: "margin", version: 1, people: legacy };
  await page.getByLabel("Select backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Review import" }),
  ).toBeVisible();
  expect((await stored(page)).people.length).toBe(1);
  await page.getByRole("button", { name: "Merge backup", exact: true }).click();
  expect((await stored(page)).people.length).toBe(3);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) =>
        k.startsWith("margin.backup.before-import."),
      ),
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Options", exact: false })
    .first()
    .click();
  const exportFile = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: false })
    .click();
  expect((await exportFile).suggestedFilename()).toMatch(/^margin-backup-/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Options", exact: false }).first(),
  ).toBeFocused();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await noAxeIssues(page);
  await page.screenshot({ path: ".dist/people-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: ".dist/people-desktop.png", fullPage: true });
});

test("corrupted saved state survives reload and UI actions", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("margin.conversations.v2", "broken original");
  });
  await page.reload();
  await expect(
    page.getByRole("alert").filter({ hasText: "could not be loaded safely" }),
  ).toContainText("could not be loaded safely");
  await page
    .getByRole("button", { name: "Just start talking", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("margin.conversations.v2")),
  ).toBe("broken original");
});
