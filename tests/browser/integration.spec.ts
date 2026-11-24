import { getDialog, expectControlValue, selectControl } from "./ui-controls";
import { expect, test, type Page } from "@playwright/test";
import { createSampleHousehold } from "../../src/domain/sample";
import type { AppState } from "../../src/domain/types";

const errorsByPage = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});
test.afterEach(({ page }) => expect(errorsByPage.get(page)).toEqual([]));
async function seed(
  page: Page,
  path = "/agreements/",
  state = createSampleHousehold(new Date()),
) {
  await page.addInitScript((value) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(value));
  }, state);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
function empty() {
  const state = createSampleHousehold(new Date());
  state.chores = [];
  state.expenses = [];
  state.agreements = [];
  state.starterMode = "empty";
  return state;
}
async function saved(page: Page): Promise<AppState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("roomieos:v1")!));
}
function agreementForm(page: Page, edit = false) {
  return getDialog(page, {
    name: edit ? "Edit agreement" : "New agreement",
    exact: true,
  });
}
function agreementActions(page: Page, title: string) {
  return page.getByRole("button", {
    name: `Actions for ${title}`,
    exact: true,
  });
}
async function action(
  page: Page,
  title: string,
  name: "Edit agreement" | "Delete agreement",
) {
  await agreementActions(page, title).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}
async function createAgreement(page: Page, title: string) {
  await page
    .getByRole("button", { name: "New agreement", exact: true })
    .click();
  await agreementForm(page).getByLabel("Title").fill(title);
  await agreementForm(page)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(agreementForm(page)).not.toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}
function summaryCard(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

test("agreement CRUD validates, persists and restores focus through keyboard menus/dialogs", async ({
  page,
}, testInfo) => {
  await seed(page, "/agreements/", empty());
  await expect(
    page.getByText("Set the ground rules", { exact: true }),
  ).toBeVisible();
  const before = await saved(page);
  await page
    .getByRole("button", { name: "Add your first agreement", exact: true })
    .click();
  await agreementForm(page).getByLabel("Title").fill("   ");
  await agreementForm(page)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(agreementForm(page).getByLabel("Title")).toBeFocused();
  await expect(
    agreementForm(page).getByText("Enter a title (1–100 characters)."),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await agreementForm(page).getByLabel("Title").fill("Quiet hours");
  await agreementForm(page)
    .getByLabel("Details")
    .fill("Quiet after 11 pm.\nCheck in before a party.");
  await agreementForm(page)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(agreementForm(page)).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quiet hours", exact: true }),
  ).toBeVisible();
  await page.reload();
  expect((await saved(page)).agreements[0].details).toBe(
    "Quiet after 11 pm.\nCheck in before a party.",
  );
  const menu = agreementActions(page, "Quiet hours");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("menuitem", { name: "Edit agreement", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.press("Enter");
  await page.keyboard.press("Enter");
  await expect(agreementForm(page, true)).toBeVisible();
  await agreementForm(page, true).getByLabel("Title").fill("Cancelled draft");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  expect((await saved(page)).agreements[0].title).toBe("Quiet hours");
  await action(page, "Quiet hours", "Edit agreement");
  await agreementForm(page, true)
    .getByLabel("Title")
    .fill("Evening quiet hours");
  await agreementForm(page, true).getByLabel("Details").fill("");
  await agreementForm(page, true)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Evening quiet hours", exact: true }),
  ).toBeVisible();
  expect((await saved(page)).agreements[0].details).toBe("");
  await page.screenshot({
    path: testInfo.outputPath("agreement-list.png"),
    fullPage: true,
  });
  await noOverflow(page);
  await action(page, "Evening quiet hours", "Delete agreement");
  const confirmation = getDialog(page, {
    name: "Delete agreement?",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(agreementActions(page, "Evening quiet hours")).toBeFocused();
  expect((await saved(page)).agreements).toHaveLength(1);
  await action(page, "Evening quiet hours", "Delete agreement");
  await confirmation
    .getByRole("button", { name: "Delete agreement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New agreement", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByText("Set the ground rules", { exact: true }),
  ).toBeVisible();
  expect((await saved(page)).agreements).toEqual([]);
});

test("agreement storage failures preserve create/edit drafts and confirmed deletion until retry", async ({
  page,
}) => {
  await seed(page, "/agreements/", empty());
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "roomieos:v1" &&
        sessionStorage.getItem("fail-agreement") === "yes"
      )
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  const fail = (yes: boolean) =>
    page.evaluate(
      (blocked) =>
        sessionStorage.setItem("fail-agreement", blocked ? "yes" : "no"),
      yes,
    );
  await page
    .getByRole("button", { name: "New agreement", exact: true })
    .click();
  await agreementForm(page).getByLabel("Title").fill("Kitchen reset");
  await agreementForm(page).getByLabel("Details").fill("Wipe the counter.");
  await fail(true);
  await agreementForm(page)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(
    agreementForm(page).getByText(/Couldn't save changes/),
  ).toBeVisible();
  await expectControlValue(
    agreementForm(page).getByLabel("Details"),
    "Wipe the counter.",
  );
  expect((await saved(page)).agreements).toEqual([]);
  await fail(false);
  await agreementForm(page)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(agreementForm(page)).not.toBeVisible();
  await action(page, "Kitchen reset", "Edit agreement");
  await agreementForm(page, true)
    .getByLabel("Details")
    .fill("Clean the stove too.");
  await fail(true);
  await agreementForm(page, true)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(
    agreementForm(page, true).getByText(/Couldn't save changes/),
  ).toBeVisible();
  expect((await saved(page)).agreements[0].details).toBe("Wipe the counter.");
  await fail(false);
  await agreementForm(page, true)
    .getByRole("button", { name: "Save agreement", exact: true })
    .click();
  await expect(agreementForm(page, true)).not.toBeVisible();
  await action(page, "Kitchen reset", "Delete agreement");
  const confirmation = getDialog(page, {
    name: "Delete agreement?",
    exact: true,
  });
  await fail(true);
  await confirmation
    .getByRole("button", { name: "Delete agreement", exact: true })
    .click();
  await expect(confirmation.getByText(/Couldn't save changes/)).toBeVisible();
  expect((await saved(page)).agreements[0].details).toBe(
    "Clean the stove too.",
  );
  await fail(false);
  await confirmation
    .getByRole("button", { name: "Delete agreement", exact: true })
    .click();
  await expect(confirmation).not.toBeVisible();
  expect((await saved(page)).agreements).toEqual([]);
});

test("agreements stay household-wide across perspectives and cross-tab changes block stale drafts", async ({
  page,
  context,
}) => {
  await seed(page, "/agreements/", empty());
  await page
    .getByRole("button", { name: "New agreement", exact: true })
    .click();
  await agreementForm(page).getByLabel("Title").fill("Unsaved local draft");
  const other = await context.newPage();
  await other.goto("/agreements/");
  await createAgreement(other, "Guest etiquette");
  await expect(
    agreementForm(page).getByText(/Close this dialog and reload/),
  ).toBeVisible();
  await expect(
    agreementForm(page).getByRole("button", {
      name: "Save agreement",
      exact: true,
    }),
  ).toBeDisabled();
  await expectControlValue(
    agreementForm(page).getByLabel("Title"),
    "Unsaved local draft",
  );
  await agreementForm(page)
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reload saved household", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guest etiquette", exact: true }),
  ).toBeVisible();
  await selectControl(page.getByLabel("Switch demo perspective"), "sam");
  await expect(
    page.getByRole("heading", { name: "Guest etiquette", exact: true }),
  ).toBeVisible();
  expect(
    (await saved(page)).agreements.map((agreement) => agreement.title),
  ).toEqual(["Guest etiquette"]);
  await other.close();
});

test("long agreement and dashboard content wraps without page or dialog overflow", async ({
  page,
}, testInfo) => {
  const state = createSampleHousehold(new Date());
  state.household.name = "H".repeat(60);
  state.members[0].name = "A".repeat(40);
  state.chores[0].title = "C".repeat(100);
  state.agreements = [
    { id: "long", title: "T".repeat(100), details: "D".repeat(1000) },
  ];
  await seed(page, "/agreements/", state);
  await noOverflow(page);
  await action(page, "T".repeat(100), "Edit agreement");
  expect(
    await agreementForm(page, true).evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("agreement-form.png"),
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await page.goto("/");
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("dashboard-long-content.png"),
    fullPage: true,
  });
});

test("dashboard personal chores and household snapshot update through real chore actions", async ({
  page,
}, testInfo) => {
  await seed(page, "/");
  const snapshot = summaryCard(page, "Household at a glance");
  await expect(summaryCard(page, "My pending chores")).toContainText("1");
  await expect(summaryCard(page, "My balance")).toContainText("CAD 10.00");
  await expect(summaryCard(page, "Open household expenses")).toContainText("3");
  await expect(snapshot).toContainText("Pending chores3");
  await expect(snapshot).toContainText("Completed chores1");
  await expect(snapshot).toContainText("Skipped chores1");
  await expect(page.getByText("Overdue", { exact: true })).toHaveCount(1);
  await selectControl(page.getByLabel("Switch demo perspective"), "sam");
  await expect(
    page.getByRole("button", { name: "Clean the bathroom", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clean the kitchen", exact: true }),
  ).toHaveCount(0);
  await expect(summaryCard(page, "My balance")).toContainText("CAD 15.00");
  await page
    .getByRole("button", { name: "Clean the bathroom", exact: true })
    .click();
  const bathroom = getDialog(page, {
    name: "Clean the bathroom",
    exact: true,
  });
  await bathroom
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add a chore", exact: true }),
  ).toBeFocused();
  await expect(summaryCard(page, "My pending chores")).toContainText("0");
  await expect(snapshot).toContainText("Pending chores2");
  await expect(snapshot).toContainText("Completed chores2");
  await selectControl(page.getByLabel("Switch demo perspective"), "avery");
  await page
    .getByRole("button", { name: "Clean the kitchen", exact: true })
    .click();
  const kitchen = getDialog(page, {
    name: "Clean the kitchen",
    exact: true,
  });
  await kitchen
    .getByRole("button", { name: "Mark completed", exact: true })
    .click();
  await kitchen
    .getByRole("button", { name: "Rotate to next", exact: true })
    .click();
  const rotation = getDialog(page, {
    name: "Rotate chore",
    exact: true,
  });
  await rotation
    .getByRole("button", { name: "Confirm rotation", exact: true })
    .click();
  await expect(rotation).not.toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(summaryCard(page, "My pending chores")).toContainText("0");
  await expect(snapshot).toContainText("Pending chores2");
  await expect(snapshot).toContainText("Completed chores2");
  expect(
    (await saved(page)).chores.find((chore) => chore.id === "kitchen"),
  ).toMatchObject({ status: "pending", assigneeId: "jordan" });
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await noOverflow(page);
});

test("empty dashboard calls to action create real chores and agreements and refresh retains their counts", async ({
  page,
}) => {
  await seed(page, "/", empty());
  const snapshot = summaryCard(page, "Household at a glance");
  await expect(summaryCard(page, "My pending chores")).toContainText("0");
  await expect(summaryCard(page, "My balance")).toContainText("CAD 0.00");
  await expect(snapshot).toContainText("Pending chores0");
  await expect(snapshot).toContainText("Completed chores0");
  await expect(
    page.getByText("No pending chores assigned", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add a chore", exact: true }).click();
  const chore = getDialog(page, { name: "New chore", exact: true });
  await chore.getByLabel("Title").fill("Wash mugs");
  await chore.getByRole("button", { name: "Save chore", exact: true }).click();
  await expect(chore).not.toBeVisible();
  await expect(summaryCard(page, "My pending chores")).toContainText("1");
  await expect(snapshot).toContainText("Pending chores1");
  await page.getByRole("link", { name: "View chores", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Chore board", exact: true }),
  ).toBeVisible();
  await selectControl(
    page.getByLabel("Change status for Wash mugs"),
    "skipped",
  );
  await page.goto("/");
  await expect(summaryCard(page, "My pending chores")).toContainText("0");
  await expect(snapshot).toContainText("Skipped chores1");
  await page
    .getByRole("link", { name: "Add a house agreement", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "House agreements",
  );
  await createAgreement(page, "Quiet kitchen");
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "View 1 house agreement", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(snapshot).toContainText("Skipped chores1");
  await page
    .getByRole("link", { name: "View 1 house agreement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Quiet kitchen", exact: true }),
  ).toBeVisible();
});

test.describe("dashboard local calendar", () => {
  test.use({ timezoneId: "America/Edmonton" });
  test("dashboard overdue labels update on focus after local midnight", async ({
    page,
  }) => {
    const time = new Date(
      await page.evaluate(() => new Date(2026, 10, 24, 23, 59).toISOString()),
    );
    await page.clock.install({ time });
    const state = createSampleHousehold(new Date(2026, 10, 24, 12));
    state.chores[0].dueDate = "2026-11-24";
    await seed(page, "/", state);
    await expect(page.getByText("Overdue", { exact: true })).toHaveCount(0);
    await page.clock.setSystemTime(new Date(time.getTime() + 120_000));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByText("Overdue", { exact: true })).toHaveCount(1);
    await expect(summaryCard(page, "Household at a glance")).toContainText(
      "Pending chores3",
    );
  });
});
