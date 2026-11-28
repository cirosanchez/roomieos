import { expect, test, type Page } from "./fixtures";
import { getDialog, selectControl } from "./ui-controls";
import { createSampleHousehold } from "../../src/domain/sample";
import { localDate } from "../../src/domain/dates";
import type { AppState } from "../../src/domain/types";

const diagnostics = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  diagnostics.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});
test.afterEach(({ page }) => expect(diagnostics.get(page)).toEqual([]));

async function seed(
  page: Page,
  path: string,
  state = createSampleHousehold(new Date()),
) {
  await page.addInitScript((initial) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(initial));
  }, state);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
async function saved(page: Page): Promise<AppState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("roomieos:v1")!));
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}
function visibleButton(page: Page, name: string) {
  return page
    .getByRole("button", { name, exact: true })
    .filter({ visible: true });
}
function discard(page: Page) {
  return getDialog(page, { name: "Discard unsaved changes?", exact: true });
}

test("expense description and status filters combine without changing balances or saved records", async ({
  page,
}, testInfo) => {
  await seed(page, "/expenses/");
  const before = await saved(page);
  const controls = page.getByRole("region", { name: "Find expenses" });
  const net = page.getByRole("region", { name: "My net position" });
  const transfers = page.getByRole("region", { name: "Who owes whom" });
  const initialNet = await net.innerText();
  const initialTransfers = await transfers.innerText();
  await expect(controls).toContainText("Showing 4 of 4 expenses.");
  await controls.getByLabel("Search expenses").fill("  BILL  ");
  await expect(controls).toContainText("Showing 1 of 4 expenses.");
  await expect(visibleButton(page, "Internet bill")).toBeVisible();
  await expect(visibleButton(page, "Weekly groceries")).toHaveCount(0);
  await controls.getByRole("button", { name: "Settled", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByText("No matching expenses", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No shared expenses yet", { exact: true }),
  ).toHaveCount(0);
  await expect(
    controls.getByRole("button", { name: "Settled", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(net).toHaveText(initialNet, { useInnerText: true });
  await expect(transfers).toHaveText(initialTransfers, { useInnerText: true });
  expect(await saved(page)).toEqual(before);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(controls.getByLabel("Search expenses")).toBeFocused();
  await controls.getByRole("button", { name: "Settled", exact: true }).click();
  await expect(visibleButton(page, "Cleaning supplies")).toBeVisible();
  await expect(visibleButton(page, "Internet bill")).toHaveCount(0);
  await controls.getByRole("button", { name: "Open", exact: true }).click();
  await expect(controls).toContainText("Showing 3 of 4 expenses.");
  await controls.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    controls.getByRole("button", { name: "Open", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("expense-filters.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(await saved(page)).toEqual(before);

  // A status change may remove the trigger from the filtered list. Keep the
  // details open, then restore focus to the main action when they close.
  await visibleButton(page, "Weekly groceries").click();
  const details = getDialog(page, { name: "Weekly groceries", exact: true });
  await details
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await getDialog(page, { name: "Mark expense as settled?", exact: true })
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await expect(
    details.getByRole("button", { name: "Reopen expense", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
  await expect(controls).toContainText("Showing 2 of 4 expenses.");
  await controls.getByRole("button", { name: "Settled", exact: true }).click();
  await visibleButton(page, "Weekly groceries").click();
  await details
    .getByRole("button", { name: "Reopen expense", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
  await expect(net).toHaveText(initialNet, { useInnerText: true });
  await page.reload();
  await expect(visibleButton(page, "Weekly groceries")).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

const forms = [
  {
    kind: "chore",
    path: "/chores/",
    create: "New chore",
    field: "Title",
    edit: "Edit chore",
    record: "Clean the kitchen",
    notes: "Notes",
  },
  {
    kind: "expense",
    path: "/expenses/",
    create: "Add expense",
    field: "Description",
    edit: "Edit expense",
    record: "Weekly groceries",
    notes: "Notes",
  },
  {
    kind: "agreement",
    path: "/agreements/",
    create: "New agreement",
    field: "Title",
    edit: "Edit agreement",
    record: "Quiet hours",
    notes: "Details",
  },
] as const;

for (const config of forms) {
  test(`${config.kind} drafts survive all dialog dismissal methods and save without a discard warning`, async ({
    page,
  }, testInfo) => {
    await seed(page, config.path);
    const before = await saved(page);
    const trigger = page.getByRole("button", {
      name: config.create,
      exact: true,
    });
    const form = getDialog(page, { name: config.create, exact: true });
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(form).not.toBeVisible();
    await expect(discard(page)).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await form.getByLabel(config.field).fill("Unfinished draft");
    await page.keyboard.press("Escape");
    await expect(discard(page)).toBeVisible();
    await expect(
      discard(page).getByRole("button", { name: "Keep editing" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      discard(page).getByRole("button", {
        name: "Discard changes",
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      discard(page).getByRole("button", { name: "Keep editing" }),
    ).toBeFocused();
    await discard(page).getByRole("button", { name: "Keep editing" }).click();
    await expect(form.getByLabel(config.field)).toHaveValue("Unfinished draft");
    await expect(form.getByLabel(config.field)).toBeFocused();
    await form
      .getByRole("button", { name: `Close ${config.create}`, exact: true })
      .click();
    await expect(discard(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(discard(page)).not.toBeVisible();
    await expect(form).toBeVisible();
    await expect(
      form.getByRole("button", { name: `Close ${config.create}`, exact: true }),
    ).toBeFocused();
    await page.mouse.click(4, 4);
    await expect(discard(page)).toBeVisible();
    await discard(page).getByRole("button", { name: "Keep editing" }).click();
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(discard(page)).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`${config.kind}-discard.png`),
      fullPage: true,
      animations: "disabled",
    });
    await discard(page)
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(form).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await saved(page)).toEqual(before);
    await trigger.click();
    await expect(form.getByLabel(config.field)).toHaveValue("");
    await form.getByLabel(config.field).fill("Reverted draft");
    await form.getByLabel(config.field).fill("");
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(form).not.toBeVisible();
    await expect(discard(page)).not.toBeVisible();
    await trigger.click();
    await form.getByLabel(config.field).fill("Saved draft");
    if (config.kind === "expense")
      await form.getByLabel("Total amount").fill("1.00");
    await form
      .getByRole("button", { name: `Save ${config.kind}`, exact: true })
      .click();
    await expect(form).not.toBeVisible();
    await expect(discard(page)).not.toBeVisible();
    await page.reload();
    const state = await saved(page);
    expect(
      config.kind === "chore"
        ? state.chores.some((row) => row.title === "Saved draft")
        : config.kind === "expense"
          ? state.expenses.some((row) => row.description === "Saved draft")
          : state.agreements.some((row) => row.title === "Saved draft"),
    ).toBe(true);
  });

  test(`${config.kind} edit forms protect changes to secondary fields and preserve the original record on discard`, async ({
    page,
  }) => {
    await seed(page, config.path);
    const before = await saved(page);
    if (config.kind === "agreement") {
      await page
        .getByRole("button", {
          name: `Actions for ${config.record}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", { name: config.edit, exact: true })
        .click();
    } else {
      await visibleButton(page, config.record).click();
      await getDialog(page, { name: config.record, exact: true })
        .getByRole("button", { name: config.edit, exact: true })
        .click();
    }
    const form = getDialog(page, { name: config.edit, exact: true });
    await form
      .getByLabel(config.notes)
      .fill("Keep these edits until I decide.");
    if (config.kind === "expense")
      await form.getByLabel("Contribution 1").fill("29.99");
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(discard(page)).toBeVisible();
    await discard(page).getByRole("button", { name: "Keep editing" }).click();
    await expect(form.getByLabel(config.notes)).toHaveValue(
      "Keep these edits until I decide.",
    );
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await discard(page)
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(form).not.toBeVisible();
    expect(await saved(page)).toEqual(before);
    if (config.kind === "agreement") {
      await expect(
        page.getByRole("button", {
          name: `Actions for ${config.record}`,
          exact: true,
        }),
      ).toBeFocused();
    } else {
      const details = getDialog(page, { name: config.record, exact: true });
      await expect(details).toBeVisible();
      await expect(
        details.getByRole("button", { name: config.edit, exact: true }),
      ).toBeFocused();
    }
  });
}

test("dashboard cards navigate by keyboard and urgency counts follow perspective and the local calendar", async ({
  page,
}, testInfo) => {
  const now = new Date("2026-11-25T12:00:00Z");
  await page.clock.install({ time: now });
  const state = createSampleHousehold(now);
  const today = localDate(now);
  state.chores.push({
    ...state.chores[0],
    id: "due-today",
    title: "Due today",
    dueDate: today,
  });
  await seed(page, "/dashboard/", state);
  const chores = page.getByRole("region", {
    name: "My pending chores",
    exact: true,
  });
  await expect(chores).toContainText("1 overdue · 1 due today");
  await chores
    .getByRole("link", { name: "My pending chores", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/chores\/?$/);
  await page.goto("/dashboard/");
  await page.getByRole("link", { name: "My balance", exact: true }).click();
  await expect(page).toHaveURL(/\/expenses\/?$/);
  await page.goto("/dashboard/");
  await page
    .getByRole("link", { name: "Open household expenses", exact: true })
    .click();
  await expect(page).toHaveURL(/\/expenses\/?$/);
  await page.goto("/dashboard/");
  await selectControl(page.getByLabel("Switch demo perspective"), "jordan");
  await expect(chores).toContainText("0 overdue · 1 due today");
  await page.clock.setSystemTime(new Date("2026-11-26T12:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(chores).toContainText("1 overdue · 0 due today");
  await selectControl(page.getByLabel("Switch demo perspective"), "avery");
  await expect(chores).toContainText("2 overdue · 0 due today");
  await page.getByRole("button", { name: "Due today", exact: true }).click();
  await getDialog(page, { name: "Due today", exact: true })
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(chores).toContainText("1 overdue · 0 due today");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("dashboard-actions.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await expect(chores).toContainText("1 overdue · 0 due today");
  expect(
    (await saved(page)).chores.find((chore) => chore.id === "due-today")
      ?.status,
  ).toBe("completed");
});
