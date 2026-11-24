import { expect, test } from "@playwright/test";
import { createSampleHousehold } from "../../src/domain/sample";

test("navigation adapts, collapsed labels have tooltips, and perspective selection works by keyboard", async ({
  page,
}, testInfo) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(state));
  }, createSampleHousehold(new Date()));
  await page.goto("/");
  const original = await page.evaluate(() =>
    localStorage.getItem("roomieos:v1"),
  );
  if (page.viewportSize()!.width >= 1024) {
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(
      page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
    ).toBeVisible();
    await expect(page.locator('[data-slot="sidebar-gap"]')).toHaveCSS(
      "width",
      "64px",
    );
    await page.getByRole("link", { name: "Chores", exact: true }).hover();
    await expect(
      page.getByRole("tooltip", { name: "Chores", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("sidebar-collapsed.png"),
      fullPage: true,
    });
    expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
      original,
    );
    expect(await page.context().cookies()).toEqual([]);
    await page.getByRole("button", { name: "Expand sidebar" }).click();
  } else {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navigation", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("navigation-sheet.png"),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeFocused();
  }
  const perspective = page.getByRole("combobox", {
    name: "Switch demo perspective",
  });
  await perspective.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(perspective).toHaveAttribute("data-value", "sam");
  await expect(perspective).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("dashboard-refreshed.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(perspective).toHaveAttribute("data-value", "sam");
  if (page.viewportSize()!.width >= 1024)
    await expect(
      page.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
