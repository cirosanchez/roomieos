import { expect, test, type Page } from "@playwright/test";

async function openNavigationIfNeeded(page: Page) {
  const trigger = page.getByRole("button", { name: "Open navigation" });
  if (page.viewportSize()!.width < 1024) {
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: "Navigation", exact: true }),
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
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your shared home, organized.",
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
    ["Dashboard", "Your shared home, organized.", "/"],
  ]) {
    await openNavigationIfNeeded(page);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .filter({ visible: true })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(
      page.getByRole("dialog", { name: "Navigation", exact: true }),
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
    page.getByRole("dialog", { name: "About RoomieOS", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("about dialog traps keyboard focus, closes with Escape and restores focus", async ({
  page,
}) => {
  await page.goto("/");
  await openNavigationIfNeeded(page);
  await page
    .getByRole("button", { name: "About this prototype", exact: true })
    .filter({ visible: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "About RoomieOS",
    exact: true,
  });
  const close = dialog.getByRole("button", { name: "Close About RoomieOS" });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  // Native dialogs may focus the document between cycles, but never an outside control.
  expect(
    await page.evaluate(
      () =>
        document.activeElement === document.body ||
        Boolean(document.activeElement?.closest("dialog[open]")),
    ),
  ).toBe(true);
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

test("welcome is informative and existing browser data remains untouched", async ({
  page,
}, testInfo) => {
  const saved = JSON.stringify({
    sentinel: "Milestone 1 must not initialize or overwrite state",
  });
  await page.addInitScript((value) => {
    localStorage.setItem("roomieos:v1", value);
  }, saved);
  await page.goto("/welcome/");
  await expect(
    page.getByRole("heading", { name: "Explore a sample household" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Start from scratch" }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("welcome.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Back to workspace" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your shared home, organized.",
  );
  await page.reload();
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
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Navigation", exact: true }),
  ).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
