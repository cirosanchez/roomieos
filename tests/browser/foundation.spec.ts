import { getDialog } from "./ui-controls";
import { expect, test, type Page } from "./fixtures";
import { createSampleHousehold } from "../../src/domain/sample";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(state));
  }, createSampleHousehold(new Date()));
});

async function openNavigationIfNeeded(page: Page) {
  const trigger = page.getByRole("button", { name: "Open navigation" });
  if (page.viewportSize()!.width < 1024) {
    await trigger.click();
    await expect(
      getDialog(page, { name: "Navigation", exact: true }),
    ).toBeVisible();
  }
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
}

test("all household routes navigate, reload and fit the viewport", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // React hydration mismatches can be console errors without a thrown page error.
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House",
  );
  await expectNoPageOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });

  for (const [label, heading, path] of [
    ["Chores", "Chores", "/chores/"],
    ["Expenses", "Expenses", "/expenses/"],
    ["Agreements", "House agreements", "/agreements/"],
    ["Settings", "Settings", "/settings/"],
    ["Dashboard", "Maple House", "/dashboard/"],
  ]) {
    await openNavigationIfNeeded(page);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .filter({ visible: true })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(
      getDialog(page, { name: "Navigation", exact: true }),
    ).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expectNoPageOverflow(page);
  }
  // Exercise a client handler after the final reload before checking diagnostics.
  await openNavigationIfNeeded(page);
  await page
    .getByRole("button", { name: "About this prototype", exact: true })
    .filter({ visible: true })
    .click();
  await expect(
    getDialog(page, { name: "About RoomieOS", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("about dialog traps keyboard focus, closes with Escape and restores focus", async ({
  page,
}) => {
  await page.goto("/dashboard/");
  await openNavigationIfNeeded(page);
  await page
    .getByRole("button", { name: "About this prototype", exact: true })
    .filter({ visible: true })
    .click();
  const dialog = getDialog(page, {
    name: "About RoomieOS",
    exact: true,
  });
  const close = dialog.getByRole("button", { name: "Close About RoomieOS" });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  const expectedFocus =
    page.viewportSize()!.width >= 1024
      ? page
          .getByRole("button", { name: "About this prototype", exact: true })
          .filter({ visible: true })
      : page.getByRole("button", { name: "Open navigation" });
  await expect(expectedFocus).toBeFocused();
});

test("saved households bypass welcome without replacing their data", async ({
  page,
}) => {
  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House",
  );
  const saved = await page.evaluate(() => localStorage.getItem("roomieos:v1"));
  await page.goto("/welcome/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House",
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House",
  );
  expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
    saved,
  );
});

test("navigation drawer closes with Escape and returns focus", async ({
  page,
}) => {
  test.skip(
    test.info().project.name === "desktop",
    "Desktop uses the sidebar.",
  );
  await page.goto("/dashboard/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(page.locator('[aria-label="Open navigation"]')).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(
    getDialog(page, { name: "Navigation", exact: true }),
  ).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
