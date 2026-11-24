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
    const sidebar = page.locator('[data-slot="sidebar-container"]');
    await expect(
      sidebar.getByRole("button", { name: "Collapse sidebar", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator("header")
        .getByRole("button", { name: /Collapse sidebar|Expand sidebar/ }),
    ).toHaveCount(0);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("sidebar-expanded.png"),
      fullPage: true,
    });
    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: originalViewport.width, height: 600 });
    const footer = page.locator('[data-slot="sidebar-footer"]');
    const footerBox = await footer.boundingBox();
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(600);
    await expect(
      footer.getByRole("button", { name: "About this prototype", exact: true }),
    ).toBeInViewport();
    await page.setViewportSize(originalViewport);
    await sidebar
      .getByRole("button", { name: "Collapse sidebar", exact: true })
      .click();
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
      animations: "disabled",
      path: testInfo.outputPath("sidebar-collapsed.png"),
      fullPage: true,
    });
    expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
      original,
    );
    expect(await page.context().cookies()).toEqual([]);
    const expand = sidebar.getByRole("button", {
      name: "Expand sidebar",
      exact: true,
    });
    const panel = await sidebar.boundingBox();
    const control = await expand.boundingBox();
    expect(control!.x).toBeGreaterThanOrEqual(panel!.x);
    expect(control!.x + control!.width).toBeLessThanOrEqual(
      panel!.x + panel!.width,
    );
    await sidebar.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await expand.click();
  } else {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navigation", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("navigation-sheet.png"),
      fullPage: true,
    });
    await page
      .getByRole("dialog", { name: "Navigation", exact: true })
      .getByRole("button", { name: "Close navigation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Open navigation", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Settings", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Navigation", exact: true }),
    ).not.toBeVisible();
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
    animations: "disabled",
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
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
