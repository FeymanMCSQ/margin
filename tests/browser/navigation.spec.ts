import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const question = (page: Page) =>
  page.getByRole("article", { name: "Current prompt" });
async function checkA11y(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
async function jump(page: Page, number: number) {
  await page
    .getByRole("button", { name: "Browse all 36", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(`^Question ${number}:`) })
    .click();
}

for (const viewport of [
  { width: 360, height: 640 },
  { width: 1280, height: 900 },
]) {
  test(`original 36 is discoverable, complete, searchable and freely navigable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const entry = page.getByRole("button", {
      name: "Original 36 questions ↗",
      exact: true,
    });
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/#talk\/36$/);
    await expect(question(page)).toContainText("Question 1 of 36");
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page
      .getByRole("button", { name: "Browse all 36", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").locator(".prompt-choice"),
    ).toHaveCount(36);
    await page
      .getByRole("searchbox", { name: "Search", exact: true })
      .fill("dinner");
    await expect(
      page.getByRole("dialog").locator(".prompt-choice"),
    ).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Search", exact: true }).fill("");
    await checkA11y(page);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Question 12:/ })
      .click();
    await page.getByRole("button", { name: "Next →", exact: true }).click();
    await expect(question(page)).toContainText("Question 13 of 36");
    await page.reload();
    await expect(
      page.getByRole("button", { name: "← Previous", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "← Previous", exact: true }).click();
    await expect(question(page)).toContainText("Question 12 of 36");
    await jump(page, 36);
    await expect(question(page)).toContainText("Question 36 of 36");
    await expect(page.getByRole("button", { name: /Set III/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("margin.conversations.v2")!).people[0]
            .asked,
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (viewport.width === 360) {
      const controls = await page
        .getByRole("group", { name: "Question navigation" })
        .boundingBox();
      const nav = await page
        .getByRole("navigation", { name: "Main navigation" })
        .boundingBox();
      expect(controls!.y).toBeGreaterThan(0);
      expect(controls!.y + controls!.height).toBeLessThanOrEqual(nav!.y + 1);
    }
    await checkA11y(page);
    await page.screenshot({
      path: `.dist/navigation-after-${viewport.width}.png`,
      fullPage: viewport.width !== 360,
    });
  });
}

test("mobile categories, person switching, scroll reset and browser Back/Forward follow visible destinations", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Just start talking", exact: true })
    .click();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const categories = page.getByRole("navigation", { name: "Talk categories" });
  for (const name of ["Open", "Discover", "Connect", "Deepen", "Reconnect"])
    await expect(
      categories.getByRole("button", { name, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Original 36", exact: true }),
  ).toBeVisible();
  await categories
    .getByRole("button", { name: "Reconnect", exact: true })
    .click();
  await expect(page).toHaveURL(/#talk\/reconnect$/);
  await page.getByRole("button", { name: "Plans", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Talk", exact: true }).click();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page).toHaveURL(/#talk\/reconnect$/);
  await page.goBack();
  await expect(page).toHaveURL(/#plans$/);
  await expect(
    page.getByRole("heading", { name: "Your ideas & plans" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#talk\/reconnect$/);
  await expect(question(page)).toContainText("[event]");
  await page.goForward();
  await expect(page).toHaveURL(/#plans$/);
  await page
    .getByRole("button", { name: "Change person", exact: true })
    .click();
  await expect(page).toHaveURL(/#people$/);
  await expect(
    page.getByRole("heading", { name: "Your people" }),
  ).toBeVisible();
});

test("used questions and other collections are explicit choices in the browser", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "margin.conversations.v1",
      JSON.stringify([
        {
          id: "ari",
          name: "Ari",
          asked: Array.from({ length: 36 }, (_, n) => n),
          current: 20,
          created: 1000,
          updated: 2000,
        },
      ]),
    );
    sessionStorage.setItem("margin.active.v1", "ari");
    history.replaceState(null, "", "/#talk/36");
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Browse all 36", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".prompt-choice")).toHaveCount(
    36,
  );
  await page
    .getByRole("group", { name: "Used status" })
    .getByRole("button", { name: "Unused", exact: true })
    .click();
  await expect(
    page.getByText("No matching cards.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Used status" })
    .getByRole("button", { name: "Used", exact: true })
    .click();
  await page.getByRole("button", { name: /^Question 24:/ }).click();
  await expect(question(page)).toContainText("Question 24 of 36");
  await expect(
    page.getByRole("checkbox", { name: "Show used", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(question(page)).toContainText("Question 25 of 36");
  await page
    .getByRole("button", { name: "Browse all 36", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Collection", exact: true })
    .selectOption("discover");
  await page
    .getByRole("group", { name: "Used status" })
    .getByRole("button", { name: "All", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("listening");
  await page.getByRole("dialog").locator(".prompt-choice").click();
  await expect(page).toHaveURL(/#talk\/discover$/);
  await expect(question(page)).toContainText("listening to on repeat");
});
