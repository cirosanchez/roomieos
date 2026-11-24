import { expect, test, type Page } from "@playwright/test";
import { createSampleHousehold } from "../../src/domain/sample";
import { localDate, relativeDate } from "../../src/domain/dates";
import { suggestedRotationDate } from "../../src/domain/chores";
import type { AppState } from "../../src/domain/types";

async function seed(page: Page, state = createSampleHousehold(new Date())) {
  await page.addInitScript((value) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(value));
  }, state);
  await page.goto("/chores/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chores");
}
async function saved(page: Page): Promise<AppState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("roomieos:v1")!));
}
function titleButton(page: Page, title: string) {
  return page
    .getByRole("button", { name: title, exact: true })
    .filter({ visible: true });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}

test("empty chores CRUD, history, rotation and both views persist", async ({
  page,
}, testInfo) => {
  const diagnostics: string[] = [];
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.push(message.text());
  });
  const state = createSampleHousehold(new Date());
  state.chores = [];
  state.expenses = [];
  await seed(page, state);
  await expect(page.getByText("Nothing on the chore board")).toBeVisible();
  const initial = await saved(page);
  await page.getByRole("button", { name: "Add a chore", exact: true }).click();
  const form = page.getByRole("dialog", { name: "New chore", exact: true });
  await form.getByLabel("Title", { exact: false }).fill("   ");
  await form.getByLabel("Due date").fill("");
  await form.getByRole("button", { name: "Save chore", exact: true }).click();
  await expect(form.getByLabel("Title", { exact: false })).toBeFocused();
  await expect(
    form.getByText("Enter a title (1–100 characters)."),
  ).toBeVisible();
  expect(await saved(page)).toEqual(initial);
  await form.getByLabel("Title", { exact: false }).fill("Clean the oven");
  await form.getByLabel("Assigned to").selectOption("jordan");
  await form.getByLabel("Due date").fill(localDate(new Date()));
  await form
    .getByLabel("Notes")
    .fill("Use the soft cloth.\nLeave the door open.");
  await form.getByRole("button", { name: "Save chore", exact: true }).click();
  await expect(form).not.toBeVisible();
  await titleButton(page, "Clean the oven").click();
  const details = page.getByRole("dialog", {
    name: "Clean the oven",
    exact: true,
  });
  await expect(details.getByText("No completions yet.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(titleButton(page, "Clean the oven")).toBeFocused();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await page
    .getByLabel("Change status for Clean the oven")
    .selectOption("completed");
  await expect(
    page
      .getByRole("region", { name: "Completed chores", exact: true })
      .getByRole("button", { name: "Clean the oven" }),
  ).toBeVisible();
  await page.getByLabel("Switch demo perspective").selectOption("sam");
  await titleButton(page, "Clean the oven").click();
  await details.getByRole("button", { name: "Reopen as pending" }).click();
  await details.getByRole("button", { name: "Mark completed" }).click();
  const history = details
    .getByRole("region", { name: "Completion history" })
    .getByRole("listitem");
  await expect(history).toHaveCount(2);
  await expect(history.nth(0)).toContainText("Sam");
  await expect(history.nth(1)).toContainText("Avery");
  const beforeRotation = await saved(page);
  await details.getByRole("button", { name: "Rotate to next" }).click();
  const rotate = page.getByRole("dialog", {
    name: "Rotate chore",
    exact: true,
  });
  await expect(rotate.getByText("Next roommate:")).toContainText("Sam");
  await expect(rotate.getByLabel("New due date")).toHaveValue(
    suggestedRotationDate(localDate(new Date()), localDate(new Date())),
  );
  await rotate.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await saved(page)).toEqual(beforeRotation);
  await expect(
    details.getByRole("button", { name: "Rotate to next" }),
  ).toBeFocused();
  await details.getByRole("button", { name: "Rotate to next" }).click();
  await rotate.getByLabel("New due date").fill("");
  await rotate.getByRole("button", { name: "Confirm rotation" }).click();
  await expect(rotate.getByLabel("New due date")).toBeFocused();
  expect(await saved(page)).toEqual(beforeRotation);
  await rotate.getByLabel("New due date").fill(relativeDate(new Date(), 10));
  await rotate.getByRole("button", { name: "Confirm rotation" }).click();
  await expect(rotate).not.toBeVisible();
  expect((await saved(page)).chores[0]).toMatchObject({
    assigneeId: "sam",
    status: "pending",
    completionHistory: beforeRotation.chores[0].completionHistory,
  });
  await details
    .getByRole("button", { name: "Edit chore", exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Edit chore", exact: true });
  await edit.getByLabel("Title", { exact: false }).fill("Clean oven and trays");
  await edit.getByRole("button", { name: "Save chore", exact: true }).click();
  const updated = page.getByRole("dialog", {
    name: "Clean oven and trays",
    exact: true,
  });
  await expect(
    updated.getByText("Use the soft cloth.\nLeave the door open."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await titleButton(page, "Clean oven and trays").click();
  await expect(
    updated
      .getByRole("region", { name: "Completion history" })
      .getByRole("listitem"),
  ).toHaveCount(2);
  await page.screenshot({
    path: testInfo.outputPath("chore-history.png"),
    fullPage: true,
  });
  await noOverflow(page);
  await updated
    .getByRole("button", { name: "Delete chore", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Delete chore?",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect((await saved(page)).chores).toHaveLength(1);
  await updated
    .getByRole("button", { name: "Delete chore", exact: true })
    .click();
  await confirmation
    .getByRole("button", { name: "Delete chore", exact: true })
    .click();
  await expect(page.getByText("Nothing on the chore board")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New chore", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(page.getByText("Nothing on the chore board")).toBeVisible();
  expect((await saved(page)).chores).toEqual([]);
  expect(diagnostics).toEqual([]);
});

test("filters, overdue and board status controls agree with list and fit the viewport", async ({
  page,
}, testInfo) => {
  await seed(page);
  await expect(
    page.getByRole("button", { name: "Board", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("region", { name: "Chore board", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(
    page.getByText("Overdue", { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);
  await page.getByLabel("Filter by roommate").selectOption("jordan");
  await expect(titleButton(page, "Take out recycling")).toBeVisible();
  await expect(
    page.getByText("Overdue", { exact: true }).filter({ visible: true }),
  ).toHaveCount(0);
  await page.getByLabel("Filter by status").selectOption("completed");
  await expect(page.getByText("No matching chores")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("chore-list.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Board", exact: true }).click();
  const board = page.getByRole("region", { name: "Chore board", exact: true });
  await expect(board.getByRole("heading", { level: 2 })).toHaveCount(3);
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("chore-board.png"),
    fullPage: true,
  });
  if (page.viewportSize()!.width < 1024) {
    expect(
      await board.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);
    await board.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => board.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  }
  await page
    .getByLabel("Change status for Clean the kitchen")
    .selectOption("skipped");
  await expect(
    page
      .getByRole("region", { name: "Skipped chores", exact: true })
      .getByRole("button", { name: "Clean the kitchen" }),
  ).toBeVisible();
  await expect(page.getByText("Overdue", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await expect(
    page
      .getByLabel("Change status for Clean the kitchen")
      .filter({ visible: true }),
  ).toHaveValue("skipped");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Chore board", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByLabel("Change status for Clean the kitchen")
      .filter({ visible: true }),
  ).toHaveValue("skipped");
  await noOverflow(page);
});

test("historical archived assignments remain editable and rotate through a large active roster", async ({
  page,
}) => {
  const state = createSampleHousehold(new Date());
  state.expenses = [];
  state.chores = state.chores.filter((chore) => chore.id === "vacuum");
  state.members[0].active = false;
  state.selectedMemberId = "jordan";
  state.members.push(
    ...Array.from({ length: 18 }, (_, index) => ({
      id: `extra-${index}`,
      name: `Roommate ${index + 4}`,
      avatar: { kind: "initials" as const, value: "" },
      active: true,
      order: index + 3,
    })),
  );
  await seed(page, state);
  await titleButton(page, "Vacuum the living room").click();
  const details = page.getByRole("dialog", {
    name: "Vacuum the living room",
    exact: true,
  });
  await expect(
    details.getByRole("button", { name: "Reopen as pending" }),
  ).toBeDisabled();
  await expect(
    details.getByRole("region", { name: "Completion history" }),
  ).toContainText("Avery (archived)");
  await details
    .getByRole("button", { name: "Edit chore", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "Edit chore", exact: true });
  await expect(editor.getByLabel("Assigned to")).toHaveValue("avery");
  await editor.getByLabel("Notes").fill("Keep the historical assignment.");
  await editor.getByRole("button", { name: "Save chore", exact: true }).click();
  expect((await saved(page)).chores[0].assigneeId).toBe("avery");
  await details.getByRole("button", { name: "Rotate to next" }).click();
  const rotate = page.getByRole("dialog", {
    name: "Rotate chore",
    exact: true,
  });
  await expect(rotate.getByText("Next roommate:")).toContainText("Jordan");
  await rotate.getByRole("button", { name: "Confirm rotation" }).click();
  await expect(rotate).not.toBeVisible();
  await expect(
    details.getByRole("region", { name: "Completion history" }),
  ).toContainText("Avery (archived)");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "New chore", exact: true }).click();
  const form = page.getByRole("dialog", { name: "New chore", exact: true });
  await expect(form.getByLabel("Assigned to").getByRole("option")).toHaveCount(
    20,
  );
  await expect(
    form.getByLabel("Assigned to").getByRole("option", { name: /Avery/ }),
  ).toHaveCount(0);
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  expect((await saved(page)).chores[0]).toMatchObject({
    assigneeId: "jordan",
    status: "pending",
    notes: "Keep the historical assignment.",
    completionHistory: state.chores[0].completionHistory,
  });
});

test("failed storage saves retain chore drafts and history until retry succeeds", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "roomieos:v1" &&
        sessionStorage.getItem("fail-chore-save") === "yes"
      )
        throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
    sessionStorage.setItem("fail-chore-save", "yes");
  });
  const before = await saved(page);
  await page.getByRole("button", { name: "New chore", exact: true }).click();
  const form = page.getByRole("dialog", { name: "New chore", exact: true });
  await form.getByLabel("Title", { exact: false }).fill("Water the plants");
  await form.getByRole("button", { name: "Save chore", exact: true }).click();
  await expect(form.getByText(/Couldn't save changes/)).toBeVisible();
  await expect(form.getByLabel("Title", { exact: false })).toHaveValue(
    "Water the plants",
  );
  expect(await saved(page)).toEqual(before);
  await page.evaluate(() => sessionStorage.removeItem("fail-chore-save"));
  await form.getByRole("button", { name: "Save chore", exact: true }).click();
  await expect(form).not.toBeVisible();
  await titleButton(page, "Water the plants").click();
  const details = page.getByRole("dialog", {
    name: "Water the plants",
    exact: true,
  });
  await page.evaluate(() => sessionStorage.setItem("fail-chore-save", "yes"));
  await details
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await expect(details.getByText(/Couldn't save changes/)).toBeVisible();
  await expect(details.getByText("No completions yet.")).toBeVisible();
  await page.evaluate(() => sessionStorage.removeItem("fail-chore-save"));
  await details
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await expect(
    details
      .getByRole("region", { name: "Completion history" })
      .getByRole("listitem"),
  ).toHaveCount(1);
  await page.evaluate(() => sessionStorage.setItem("fail-chore-save", "yes"));
  await details
    .getByRole("button", { name: "Delete chore", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Delete chore?",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Delete chore", exact: true })
    .click();
  await expect(confirmation.getByText(/Couldn't save changes/)).toBeVisible();
  expect((await saved(page)).chores.at(-1)?.completionHistory).toHaveLength(1);
  await page.evaluate(() => sessionStorage.removeItem("fail-chore-save"));
  await confirmation
    .getByRole("button", { name: "Delete chore", exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  expect((await saved(page)).chores).toHaveLength(before.chores.length);
});

test("long chore content wraps in List, Board and dialogs", async ({
  page,
}) => {
  const state = createSampleHousehold(new Date());
  state.chores = [state.chores[0]];
  const title = "C".repeat(100);
  state.chores[0].title = title;
  state.chores[0].notes = "N".repeat(1000);
  state.members[0].name = "A".repeat(40);
  state.members[1].name = "J".repeat(40);
  await seed(page, state);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await noOverflow(page);
  await page.getByRole("button", { name: "Board", exact: true }).click();
  await noOverflow(page);
  await titleButton(page, title).click();
  const details = page.getByRole("dialog", { name: title, exact: true });
  expect(
    await details.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(false);
  await details.getByRole("button", { name: "Rotate to next" }).click();
  const rotation = page.getByRole("dialog", {
    name: "Rotate chore",
    exact: true,
  });
  expect(
    await rotation.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(false);
  const body = rotation.locator("div.overflow-y-auto");
  expect(
    await body.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(false);
  await page.keyboard.press("Escape");
  await expect(
    details.getByRole("button", { name: "Rotate to next" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(titleButton(page, title)).toBeFocused();
});

test("a cross-tab change blocks an open chore draft until explicit reload", async ({
  page,
  context,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "New chore", exact: true }).click();
  const form = page.getByRole("dialog", { name: "New chore", exact: true });
  await form.getByLabel("Title", { exact: false }).fill("Unsaved draft");
  const other = await context.newPage();
  await other.goto("/chores/");
  await other
    .getByLabel("Change status for Clean the kitchen")
    .filter({ visible: true })
    .selectOption("completed");
  await expect(form.getByText(/Close this dialog and reload/)).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Save chore", exact: true }),
  ).toBeDisabled();
  await expect(form.getByLabel("Title", { exact: false })).toHaveValue(
    "Unsaved draft",
  );
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Reload saved household", exact: true })
    .click();
  await expect(
    page
      .getByLabel("Change status for Clean the kitchen")
      .filter({ visible: true }),
  ).toHaveValue("completed");
  expect(
    (await saved(page)).chores.some((chore) => chore.title === "Unsaved draft"),
  ).toBe(false);
  await other.close();
});

test("overdue updates after a local date change on window focus", async ({
  page,
}) => {
  const time = new Date(
    await page.evaluate(() => new Date(2026, 10, 23, 23, 59).toISOString()),
  );
  await page.clock.install({ time });
  // Seed the same calendar day in the runner's zone; the simulated clock uses the browser's zone.
  await seed(page, createSampleHousehold(new Date(2026, 10, 23, 12)));
  await expect(
    page.getByText("Overdue", { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);
  await page.clock.setSystemTime(new Date(time.getTime() + 2 * 60_000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(
    page.getByText("Overdue", { exact: true }).filter({ visible: true }),
  ).toHaveCount(2);
});
