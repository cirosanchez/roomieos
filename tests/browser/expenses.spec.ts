import { expect, test, type Page } from "@playwright/test";
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
async function seed(page: Page, state?: AppState) {
  const value = state ?? {
    ...createSampleHousehold(new Date()),
    expenses: [],
    chores: [],
  };
  await page.addInitScript((initial) => {
    if (localStorage.getItem("roomieos:v1") === null)
      localStorage.setItem("roomieos:v1", JSON.stringify(initial));
  }, value);
  await page.goto("/expenses/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Expenses");
}
async function saved(page: Page): Promise<AppState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("roomieos:v1")!));
}
function title(page: Page, name: string) {
  return page
    .getByRole("button", { name, exact: true })
    .filter({ visible: true });
}
function form(page: Page, edit = false) {
  return page.getByRole("dialog", {
    name: edit ? "Edit expense" : "Add expense",
    exact: true,
  });
}
async function add(page: Page, description: string, amount = "1.00") {
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await form(page).getByLabel("Description").fill(description);
  await form(page).getByLabel("Total amount").fill(amount);
}
async function saveForm(page: Page, edit = false) {
  await form(page, edit)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(form(page, edit)).not.toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
}
function myNet(page: Page) {
  return page.getByRole("region", { name: "My net position", exact: true });
}

test("empty expense CRUD, cent preview, net balances and whole settlement persist", async ({
  page,
}, testInfo) => {
  await seed(page);
  await expect(
    page.getByText("No shared expenses yet", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("All settled up", { exact: true })).toBeVisible();
  await add(page, "Shared snacks");
  await expect(form(page).getByLabel("Contribution 1")).toHaveValue("1.00");
  const preview = form(page).getByLabel("Share preview", { exact: true });
  await expect(preview).toContainText("CAD 0.34");
  await expect(preview.getByText("CAD 0.33", { exact: true })).toHaveCount(2);
  await form(page)
    .getByLabel("Notes")
    .fill("Fruit and tea.\nKeep the receipt in the kitchen.");
  await page.screenshot({
    path: testInfo.outputPath("expense-form.png"),
    fullPage: true,
  });
  await saveForm(page);
  await expect(myNet(page)).toContainText("CAD 0.66");
  await expect(myNet(page)).toContainText("you are owed");
  await expect(
    page.getByRole("region", { name: "Who owes whom" }),
  ).toContainText("Jordan owes Avery");
  await title(page, "Shared snacks").click();
  const details = page.getByRole("dialog", {
    name: "Shared snacks",
    exact: true,
  });
  await expect(
    details.getByRole("region", { name: "Payer contributions" }),
  ).toContainText("CAD 1.00");
  await expect(
    details.getByRole("region", { name: "Participant shares" }),
  ).toContainText("CAD 0.34");
  await details
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  const confirm = page.getByRole("dialog", {
    name: "Mark expense as settled?",
    exact: true,
  });
  await expect(confirm).toContainText(
    "full expense was resolved outside RoomieOS",
  );
  await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await saved(page)).expenses[0].status).toBe("open");
  await expect(
    details.getByRole("button", { name: "Mark as settled", exact: true }),
  ).toBeFocused();
  await details
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await confirm
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await expect(
    details.getByRole("button", { name: "Reopen expense" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(myNet(page)).toContainText("CAD 0.00");
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "My balance", exact: true }),
  ).toContainText("CAD 0.00");
  await expect(
    page.getByRole("region", { name: "Open household expenses", exact: true }),
  ).toContainText("0");
  await page.goto("/settings/");
  await expect(page.getByLabel("Household currency")).toBeDisabled();
  await page.goto("/expenses/");
  await title(page, "Shared snacks").click();
  await details
    .getByRole("button", { name: "Reopen expense", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(myNet(page)).toContainText("CAD 0.66");
  await page.getByLabel("Switch demo perspective").selectOption("sam");
  await expect(myNet(page)).toContainText("CAD 0.33");
  await expect(myNet(page)).toContainText("you owe");
  await title(page, "Shared snacks").click();
  await details
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await form(page, true).getByLabel("Description").fill("Snacks and tea");
  await form(page, true).getByLabel("Total amount").fill("2.00");
  await expect(form(page, true).getByLabel("Contribution 1")).toHaveValue(
    "2.00",
  );
  await saveForm(page, true);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(myNet(page)).toContainText("CAD 0.66");
  expect(
    (await saved(page)).expenses[0].participants.map((row) => row.amountCents),
  ).toEqual([67, 67, 66]);
  await page.screenshot({
    path: testInfo.outputPath("expense-balances.png"),
    fullPage: true,
  });
  await noOverflow(page);
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "My balance", exact: true }),
  ).toContainText("CAD 0.66");
  await expect(
    page.getByRole("region", { name: "My balance", exact: true }),
  ).toContainText("You owe");
  await page.goto("/expenses/");
  await title(page, "Snacks and tea").click();
  const updated = page.getByRole("dialog", {
    name: "Snacks and tea",
    exact: true,
  });
  await updated
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  const deletion = page.getByRole("dialog", {
    name: "Delete expense?",
    exact: true,
  });
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await saved(page)).expenses).toHaveLength(1);
  await updated
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  await deletion
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add expense", exact: true }),
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByText("No shared expenses yet", { exact: true }),
  ).toBeVisible();
  await page.goto("/settings/");
  await expect(page.getByLabel("Household currency")).toBeEnabled();
});

test("multiple payers, percentage rounding and fixed shares revalidate independently", async ({
  page,
}) => {
  await seed(page);
  await add(page, "Split groceries");
  await form(page)
    .getByRole("button", { name: "Add payer", exact: true })
    .click();
  await form(page).getByLabel("Contribution 1").fill("0.60");
  await form(page).getByLabel("Contribution 2").fill("0.39");
  await form(page).getByRole("button", { name: "By %", exact: true }).click();
  for (const name of ["Avery", "Jordan", "Sam"])
    await form(page).getByLabel(`${name}'s percentage (%)`).fill("33.33");
  await form(page)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(
    form(page).getByText("Add CAD 0.01 to the contributions.", { exact: true }),
  ).toBeVisible();
  await expect(
    form(page).getByText("Percentages must total exactly 100.00%."),
  ).toBeVisible();
  expect((await saved(page)).expenses).toEqual([]);
  await form(page).getByLabel("Contribution 2").fill("0.40");
  await form(page).getByLabel("Avery's percentage (%)").fill("33.34");
  await saveForm(page);
  let record = (await saved(page)).expenses[0];
  expect(record.payers.map((row) => row.amountCents)).toEqual([60, 40]);
  expect(record.participants.map((row) => row.amountCents)).toEqual([
    34, 33, 33,
  ]);
  expect(record.percentageBasisPoints).toEqual({
    avery: 3334,
    jordan: 3333,
    sam: 3333,
  });
  await title(page, "Split groceries").click();
  const details = page.getByRole("dialog", {
    name: "Split groceries",
    exact: true,
  });
  await expect(
    details.getByRole("region", { name: "Participant shares" }),
  ).toContainText("33.34%");
  await details
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await form(page, true)
    .getByRole("button", { name: "By amount", exact: true })
    .click();
  await form(page, true)
    .getByLabel("Share with Avery", { exact: true })
    .uncheck();
  await form(page, true).getByLabel("Jordan's share (CAD)").fill("0.00");
  await form(page, true).getByLabel("Sam's share (CAD)").fill("0.99");
  await form(page, true)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(
    form(page, true).getByText("Add CAD 0.01 to the shares.", { exact: true }),
  ).toBeVisible();
  expect((await saved(page)).expenses[0]).toEqual(record);
  await form(page, true).getByLabel("Sam's share (CAD)").fill("1.00");
  await form(page, true).getByLabel("Category").selectOption("Rent");
  await saveForm(page, true);
  await page.keyboard.press("Escape");
  await page.reload();
  record = (await saved(page)).expenses[0];
  expect(record.splitMethod).toBe("fixed");
  expect(record.category).toBe("Rent");
  expect(record.percentageBasisPoints).toBeUndefined();
  expect(record.participants).toEqual([
    { memberId: "jordan", amountCents: 0 },
    { memberId: "sam", amountCents: 100 },
  ]);
  await title(page, "Split groceries").click();
  await details
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await form(page, true)
    .getByRole("button", { name: "Equally", exact: true })
    .click();
  await form(page, true).getByLabel("Total amount").fill("2.00");
  await form(page, true)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(
    form(page, true).getByText("Add CAD 1.00 to the contributions.", {
      exact: true,
    }),
  ).toBeVisible();
  await form(page, true).getByLabel("Contribution 1").fill("1.60");
  await saveForm(page, true);
  expect(
    (await saved(page)).expenses[0].participants.map((row) => row.amountCents),
  ).toEqual([100, 100]);
});

test("invalid input shows labeled errors, saves nothing and retains the draft", async ({
  page,
}) => {
  await seed(page);
  await add(page, "   ", "1.001");
  await form(page).getByLabel("Date", { exact: false }).fill("");
  for (const name of ["Avery", "Jordan", "Sam"])
    await form(page)
      .getByLabel(`Share with ${name}`, { exact: true })
      .uncheck();
  await form(page)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(form(page).getByLabel("Description")).toBeFocused();
  await expect(
    form(page).getByText("Enter a description (1–100 characters)."),
  ).toBeVisible();
  await expect(
    form(page).getByText("Choose at least one participant."),
  ).toBeVisible();
  await expect(form(page).getByLabel("Total amount")).toHaveValue("1.001");
  expect((await saved(page)).expenses).toEqual([]);
  await form(page).getByLabel("Description").fill("Valid later");
  await form(page).getByLabel("Total amount").fill("1.00");
  await form(page)
    .getByLabel("Date", { exact: false })
    .fill(localDate(new Date()));
  await form(page).getByLabel("Share with Sam", { exact: true }).check();
  await form(page).getByLabel("Contribution 1").fill("-1");
  await form(page)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(form(page).getByLabel("Contribution 1")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect((await saved(page)).expenses).toEqual([]);
  await form(page).getByLabel("Contribution 1").fill("1.00");
  await saveForm(page);
  expect((await saved(page)).expenses[0].participants).toEqual([
    { memberId: "sam", amountCents: 100 },
  ]);
});

test("archived historical roles remain editable and require restoration to reopen", async ({
  page,
}) => {
  const state = createSampleHousehold(new Date());
  state.chores = [];
  state.expenses = [{ ...state.expenses[0], status: "settled" }];
  state.members[0].active = false;
  state.selectedMemberId = "jordan";
  await seed(page, state);
  await title(page, "Weekly groceries").click();
  const details = page.getByRole("dialog", {
    name: "Weekly groceries",
    exact: true,
  });
  await expect(
    details.getByRole("button", { name: "Reopen expense" }),
  ).toBeDisabled();
  await expect(
    details.getByText(
      "Restore Avery in Settings before reopening this expense.",
    ),
  ).toBeVisible();
  await details
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await expect(
    form(page, true).getByLabel("Payer 1", { exact: true }),
  ).toHaveValue("avery");
  await expect(
    form(page, true).getByLabel("Share with Avery (archived)"),
  ).toBeChecked();
  await form(page, true).getByLabel("Notes").fill("Historical edit retained.");
  await saveForm(page, true);
  await page.keyboard.press("Escape");
  await add(page, "New selection");
  await expect(
    form(page).getByLabel("Payer 1", { exact: true }).getByRole("option"),
  ).toHaveCount(2);
  await expect(
    form(page).getByLabel("Share with Avery", { exact: false }),
  ).toHaveCount(0);
  await form(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await page.goto("/settings/");
  await page
    .getByRole("button", { name: "Restore Avery", exact: true })
    .click();
  await page.goto("/expenses/");
  await title(page, "Weekly groceries").click();
  await details
    .getByRole("button", { name: "Reopen expense", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.reload();
  expect((await saved(page)).expenses[0]).toMatchObject({
    status: "open",
    notes: "Historical edit retained.",
    payers: state.expenses[0].payers,
    participants: state.expenses[0].participants,
  });
});

test("failed expense writes retain drafts and balances through create/edit/settle/reopen/delete retries", async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "roomieos:v1" &&
        sessionStorage.getItem("fail-expense") === "yes"
      )
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  const fail = (yes: boolean) =>
    page.evaluate(
      (blocked) =>
        sessionStorage.setItem("fail-expense", blocked ? "yes" : "no"),
      yes,
    );
  await add(page, "Keep this draft");
  await fail(true);
  await form(page)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(form(page).getByText(/Couldn't save changes/)).toBeVisible();
  await expect(form(page).getByLabel("Description")).toHaveValue(
    "Keep this draft",
  );
  expect((await saved(page)).expenses).toEqual([]);
  await fail(false);
  await saveForm(page);
  await title(page, "Keep this draft").click();
  const details = page.getByRole("dialog", {
    name: "Keep this draft",
    exact: true,
  });
  await details
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await form(page, true).getByLabel("Notes").fill("New notes.");
  await fail(true);
  await form(page, true)
    .getByRole("button", { name: "Save expense", exact: true })
    .click();
  await expect(
    form(page, true).getByText(/Couldn't save changes/),
  ).toBeVisible();
  expect((await saved(page)).expenses[0].notes).toBe("");
  await fail(false);
  await saveForm(page, true);
  await details
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  const settle = page.getByRole("dialog", {
    name: "Mark expense as settled?",
    exact: true,
  });
  await fail(true);
  await settle
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await expect(settle.getByText(/Couldn't save changes/)).toBeVisible();
  expect((await saved(page)).expenses[0].status).toBe("open");
  await fail(false);
  await settle
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await fail(true);
  await details
    .getByRole("button", { name: "Reopen expense", exact: true })
    .click();
  await expect(details.getByText(/Couldn't save changes/)).toBeVisible();
  expect((await saved(page)).expenses[0].status).toBe("settled");
  await fail(false);
  await details
    .getByRole("button", { name: "Reopen expense", exact: true })
    .click();
  await details
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  const deletion = page.getByRole("dialog", {
    name: "Delete expense?",
    exact: true,
  });
  await fail(true);
  await deletion
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  await expect(deletion.getByText(/Couldn't save changes/)).toBeVisible();
  expect((await saved(page)).expenses).toHaveLength(1);
  await fail(false);
  await deletion
    .getByRole("button", { name: "Delete expense", exact: true })
    .click();
  await expect(myNet(page)).toContainText("CAD 0.00");
});

test("20 participants, long text and large amounts fit forms, details, dashboard and list", async ({
  page,
}, testInfo) => {
  const state = createSampleHousehold(new Date());
  state.expenses = [];
  state.chores = [];
  state.members.push(
    ...Array.from({ length: 17 }, (_, index) => ({
      ...state.members[0],
      id: `extra-${index}`,
      name: `Roommate ${index + 4}`,
      order: index + 3,
    })),
  );
  state.members[0].name = "A".repeat(40);
  await seed(page, state);
  await add(page, "E".repeat(100), "90071992547409.91");
  await form(page).getByLabel("Notes").fill("N".repeat(1000));
  await expect(form(page).getByRole("checkbox")).toHaveCount(20);
  expect(
    await form(page).evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(false);
  await noOverflow(page);
  await saveForm(page);
  const record = (await saved(page)).expenses[0];
  expect(record.participants).toHaveLength(20);
  expect(
    record.participants.reduce((sum, row) => sum + BigInt(row.amountCents), 0n),
  ).toBe(BigInt(Number.MAX_SAFE_INTEGER));
  await noOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("large-expense.png"),
    fullPage: true,
  });
  await title(page, "E".repeat(100)).click();
  const details = page.getByRole("dialog", {
    name: "E".repeat(100),
    exact: true,
  });
  expect(
    await details.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(false);
  await details
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "Mark expense as settled?",
    exact: true,
  });
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.goto("/");
  await noOverflow(page);
});

test("a settlement in another tab blocks an open expense draft until reload", async ({
  page,
  context,
}) => {
  const state = createSampleHousehold(new Date());
  state.expenses = [state.expenses[0]];
  await seed(page, state);
  await title(page, "Weekly groceries").click();
  await page
    .getByRole("dialog", { name: "Weekly groceries", exact: true })
    .getByRole("button", { name: "Edit expense", exact: true })
    .click();
  await form(page, true).getByLabel("Description").fill("Unsaved edit");
  const other = await context.newPage();
  await other.goto("/expenses/");
  await title(other, "Weekly groceries").click();
  await other
    .getByRole("dialog", { name: "Weekly groceries", exact: true })
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await other
    .getByRole("dialog", { name: "Mark expense as settled?", exact: true })
    .getByRole("button", { name: "Mark as settled", exact: true })
    .click();
  await expect(
    form(page, true).getByText(/Close this dialog and reload/),
  ).toBeVisible();
  await expect(
    form(page, true).getByRole("button", { name: "Save expense", exact: true }),
  ).toBeDisabled();
  await expect(form(page, true).getByLabel("Description")).toHaveValue(
    "Unsaved edit",
  );
  await form(page, true)
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Reload saved household", exact: true })
    .click();
  await expect(myNet(page)).toContainText("CAD 0.00");
  expect((await saved(page)).expenses[0]).toMatchObject({
    description: "Weekly groceries",
    status: "settled",
  });
  await other.close();
});
