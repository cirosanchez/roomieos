import { expect, test } from "./fixtures";
import { createSampleHousehold } from "../../src/domain/sample";

test("navigation adapts, collapsed labels have tooltips, and perspective selection works by keyboard", async ({
  page,
}, testInfo) => {
  await page.addInitScript((state) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(state));
  }, createSampleHousehold(new Date()));
  await page.goto("/dashboard/");
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
  const perspective = page.getByRole("button", {
    name: "Switch demo perspective",
  });
  await perspective.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(
    page.getByRole("menuitemradio", { name: /Avery/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("perspective-menu.png"),
  });
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

test("perspective menu contains long names and scrolls a full roster without changing shared records", async ({
  page,
}, testInfo) => {
  const state = createSampleHousehold(new Date());
  state.household.name = "A".repeat(60);
  state.members[0].name = "A".repeat(40);
  for (let index = 3; index < 20; index++)
    state.members.push({
      id: `roommate-${index}`,
      name: `Roommate ${index} ${"B".repeat(28)}`,
      active: true,
      order: index,
      avatar: { kind: "initials", value: "" },
    });
  state.members.push({
    id: "archived",
    name: "Archived roommate",
    active: false,
    order: 20,
    avatar: { kind: "initials", value: "" },
  });
  await page.addInitScript((saved) => {
    if (!localStorage.getItem("roomieos:v1"))
      localStorage.setItem("roomieos:v1", JSON.stringify(saved));
  }, state);
  await page.goto("/chores/");
  const trigger = page.getByRole("button", { name: "Switch demo perspective" });
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(20);
  await expect(menu.getByText("Archived roommate")).toHaveCount(0);
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(menu.getByText(/saved in this browser only/)).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("perspective-menu-full-roster.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
    JSON.stringify(state),
  );
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitemradio").last()).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toHaveAttribute("data-value", "roommate-19");
  await page.reload();
  await expect(trigger).toHaveAttribute("data-value", "roommate-19");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("roomieos:v1")!),
  );
  expect(saved).toEqual({ ...state, selectedMemberId: "roommate-19" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});
