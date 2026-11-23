import { expect, test, type Page } from "@playwright/test";
import { createSampleHousehold } from "../../src/domain/sample";
import type { AppState } from "../../src/domain/types";

async function saved(page: Page): Promise<AppState | null> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("roomieos:v1") ?? "null"),
  );
}
async function settings(page: Page) {
  await page.goto("/settings/");
  await expect(
    page.getByRole("heading", { name: "Settings", level: 1 }),
  ).toBeVisible();
}
async function sample(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome\/$/);
  await page.getByRole("radio", { name: /Explore a sample household/ }).check();
  await page.getByLabel("Household currency").selectOption("USD");
  await page.getByRole("button", { name: "Continue with sample" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House",
  );
}
async function enterEmpty(page: Page) {
  await page.goto("/welcome/");
  await page.getByRole("radio", { name: /Start from scratch/ }).check();
  await page.getByLabel("Household name").fill("Cedar House");
  await page.getByLabel("Household currency").selectOption("EUR");
  await page.getByLabel("Roommate 1 name").fill("Alex");
  await page.getByLabel("Roommate 2 name").fill("Morgan");
}
async function createEmpty(page: Page) {
  await enterEmpty(page);
  await page.getByRole("button", { name: "Create my household" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cedar House",
  );
}
async function addMember(page: Page, name: string) {
  await page.getByRole("button", { name: "Add roommate", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add roommate",
    exact: true,
  });
  await dialog.getByLabel("Roommate name").fill(name);
  await dialog
    .getByRole("button", { name: "Add roommate", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test("first run is explicit; sample, profile and settings persist without reseeding", async ({
  page,
}, testInfo) => {
  await page.goto("/chores/");
  await expect(page).toHaveURL(/\/welcome\/$/);
  await expect(page.getByRole("radio", { name: /Explore/ })).not.toBeChecked();
  await expect(
    page.getByRole("radio", { name: /Start from scratch/ }),
  ).not.toBeChecked();
  expect(await saved(page)).toBeNull();
  await page.screenshot({
    path: testInfo.outputPath("welcome.png"),
    fullPage: true,
  });
  await sample(page);
  const original = (await saved(page))!;
  expect(original.household.currency).toBe("USD");
  expect(original.members).toHaveLength(3);
  expect(original.chores).toHaveLength(5);
  expect(original.expenses).toHaveLength(4);
  expect(original.agreements).toHaveLength(3);
  await page.getByLabel("Switch demo perspective").selectOption("sam");
  await expect(
    page.getByText("Your household from Sam's perspective."),
  ).toBeVisible();
  await expect(
    page.getByText("Clean the bathroom", { exact: true }),
  ).toBeVisible();
  await settings(page);
  await expect(page.getByLabel("Household currency")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Archive Sam", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Household name").fill("Maple House Updated");
  await page.getByRole("button", { name: "Save household" }).click();
  await expect(page.getByRole("status")).toHaveText(/Household saved/);
  await page.reload();
  await expect(page.getByLabel("Household name")).toHaveValue(
    "Maple House Updated",
  );
  await expect(page.getByLabel("Switch demo perspective")).toHaveValue("sam");
  const updated = (await saved(page))!;
  expect(updated).toEqual({
    ...original,
    household: { name: "Maple House Updated", currency: "USD" },
    selectedMemberId: "sam",
  });
  await page.goto("/welcome/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House Updated",
  );
  expect(await saved(page)).toEqual(updated);
});

test("empty setup validates fields and creates an empty household with editable currency", async ({
  page,
}, testInfo) => {
  await page.goto("/welcome/");
  await page.getByRole("radio", { name: /Start from scratch/ }).check();
  await page.getByRole("button", { name: "Create my household" }).click();
  await expect(page.getByLabel("Household name")).toBeFocused();
  await expect(
    page.getByText("Enter a household name (1–60 characters)."),
  ).toBeVisible();
  expect(await saved(page)).toBeNull();
  await page.getByLabel("Household name").fill("  Cedar House  ");
  await page.getByLabel("Household currency").selectOption("EUR");
  await page.getByLabel("Roommate 1 name").fill("  Alex  ");
  await page.getByLabel("Roommate 2 name").fill("Morgan");
  await page.screenshot({
    path: testInfo.outputPath("empty-setup.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create my household" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cedar House",
  );
  const state = (await saved(page))!;
  expect(state.starterMode).toBe("empty");
  expect(state.members.map((member) => member.name)).toEqual([
    "Alex",
    "Morgan",
  ]);
  expect([state.chores, state.expenses, state.agreements]).toEqual([
    [],
    [],
    [],
  ]);
  await settings(page);
  await page.getByLabel("Household currency").selectOption("GBP");
  await page.getByRole("button", { name: "Save household" }).click();
  await page.reload();
  await expect(page.getByLabel("Household currency")).toHaveValue("GBP");
  expect((await saved(page))!.household.currency).toBe("GBP");
  const longName = "W".repeat(60);
  await page.getByLabel("Household name").fill(longName);
  await page.getByRole("button", { name: "Save household" }).click();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(longName);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("roster editing, limits, archive fallback and restore retain stable identities", async ({
  page,
}, testInfo) => {
  await createEmpty(page);
  await settings(page);
  await expect(
    page.getByRole("button", { name: "Archive Alex", exact: true }),
  ).toBeDisabled();
  await addMember(page, "Taylor");
  const original = (await saved(page))!;
  const taylor = original.members.find((member) => member.name === "Taylor")!;
  await page.getByLabel("Switch demo perspective").selectOption(taylor.id);
  await page
    .getByRole("button", { name: "Archive Taylor", exact: true })
    .click();
  let dialog = page.getByRole("dialog", {
    name: "Archive Taylor?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    (await saved(page))!.members.find((member) => member.id === taylor.id)!
      .active,
  ).toBe(true);
  await page
    .getByRole("button", { name: "Archive Taylor", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Archive Taylor?", exact: true });
  await dialog
    .getByRole("button", { name: "Archive roommate", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Switch demo perspective")).toHaveValue(
    original.members[0].id,
  );
  await page.reload();
  await expect(
    page
      .getByRole("list", { name: "Archived roommates" })
      .getByRole("button", { name: "Restore Taylor", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore Taylor", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit Taylor", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Edit roommate",
    exact: true,
  });
  await editor.getByLabel("Roommate name").fill("Taylor Lee");
  await editor.getByLabel("Avatar", { exact: true }).selectOption("☀️");
  await editor.getByRole("button", { name: "Save roommate" }).click();
  await expect(editor).not.toBeVisible();
  await addMember(page, "Riley");
  await addMember(page, "Casey");
  await expect(
    page.getByRole("button", { name: "Add roommate", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("settings.png"),
    fullPage: true,
  });
  await page.reload();
  const restored = (await saved(page))!;
  expect(restored.members.find((member) => member.id === taylor.id)).toEqual({
    ...taylor,
    name: "Taylor Lee",
    avatar: { kind: "icon", value: "☀️" },
  });
  expect(restored.members.map((member) => member.order)).toEqual([
    0, 1, 2, 3, 4,
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("20-roommate setup, new avatars and restore limits persist on mobile and desktop", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.goto("/welcome/");
  await page.getByRole("radio", { name: /Start from scratch/ }).check();
  await page.getByLabel("Household name").fill("Campus House");
  for (let count = 2; count < 20; count++)
    await page
      .getByRole("button", { name: "Add roommate", exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Add roommate", exact: true }),
  ).not.toBeVisible();
  for (let index = 1; index <= 20; index++)
    await page
      .getByLabel(`Roommate ${index} name`, { exact: false })
      .fill(`Roommate ${index}`);
  await expect(
    page.getByLabel("Roommate 1 avatar").locator("option"),
  ).toHaveCount(41);
  await page.getByLabel("Roommate 1 avatar").selectOption({ label: "🦊 Fox" });
  await page
    .getByLabel("Roommate 20 avatar")
    .selectOption({ label: "📚 Books" });
  await page.getByRole("button", { name: "Create my household" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Campus House",
  );
  const original = (await saved(page))!;
  expect(original.members).toHaveLength(20);
  expect(original.members[0].avatar).toEqual({ kind: "icon", value: "🦊" });
  expect(original.members[19].avatar).toEqual({ kind: "icon", value: "📚" });
  await expect(
    page.getByLabel("Switch demo perspective").locator("option"),
  ).toHaveCount(20);
  await page
    .getByLabel("Switch demo perspective")
    .selectOption(original.members[19].id);
  await settings(page);
  await expect(
    page.getByRole("button", { name: "Add roommate", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Edit Roommate 2", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit roommate",
    exact: true,
  });
  await editor
    .getByLabel("Avatar", { exact: true })
    .selectOption({ label: "🚀 Rocket" });
  await editor.getByRole("button", { name: "Save roommate" }).click();
  await page
    .getByRole("button", { name: "Archive Roommate 20", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Archive Roommate 20?", exact: true })
    .getByRole("button", { name: "Archive roommate", exact: true })
    .click();
  await expect(page.getByLabel("Switch demo perspective")).toHaveValue(
    original.members[0].id,
  );
  await addMember(page, "Replacement");
  await expect(
    page.getByRole("button", { name: "Restore Roommate 20", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Archive Replacement", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Archive Replacement?", exact: true })
    .getByRole("button", { name: "Archive roommate", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore Roommate 20", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Archive Roommate 20", exact: true }),
  ).toBeVisible();
  const restored = (await saved(page))!;
  expect(
    restored.members
      .filter((member) => member.active)
      .map((member) => member.id),
  ).toEqual(original.members.map((member) => member.id));
  expect(restored.members[0].avatar).toEqual(original.members[0].avatar);
  expect(restored.members[1].avatar).toEqual({ kind: "icon", value: "🚀" });
  expect(restored.members[19].avatar).toEqual(original.members[19].avatar);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("large-household-settings.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

for (const [name, raw] of [
  ["malformed", "{broken"],
  ["unsupported", JSON.stringify({ schemaVersion: 2 })],
]) {
  test(`${name} saved data is preserved until confirmed recovery`, async ({
    page,
  }) => {
    await page.goto("/welcome/");
    await page.evaluate(
      (value) => localStorage.setItem("roomieos:v1", value),
      raw,
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Saved data couldn't be opened" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Reset saved data", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Reset saved data?",
      exact: true,
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
      raw,
    );
    await page
      .getByRole("button", { name: "Reset saved data", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Erase saved household", exact: true })
      .click();
    await expect(page.getByRole("radio", { name: /Explore/ })).toBeVisible();
    await page.reload();
    expect(await saved(page)).toBeNull();
  });
}

test("blocked reads show retry without overwriting the saved household", async ({
  page,
}) => {
  await page.addInitScript((state) => {
    localStorage.setItem("roomieos:v1", JSON.stringify(state));
    const original = Storage.prototype.getItem;
    Object.assign(window, {
      allowRoomieosReads: () => {
        Storage.prototype.getItem = original;
      },
    });
    Storage.prototype.getItem = function (key) {
      if (key === "roomieos:v1")
        throw new DOMException("Blocked", "SecurityError");
      return original.call(this, key);
    };
  }, createSampleHousehold(new Date()));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Browser storage is unavailable" }),
  ).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { allowRoomieosReads: () => void }
    ).allowRoomieosReads(),
  );
  await page.getByRole("button", { name: "Retry opening saved data" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maple House",
  );
  expect((await saved(page))!.members).toHaveLength(3);
});

test("failed writes keep setup and settings drafts available for retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, {
      allowRoomieosWrites: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key, value) {
      if (key === "roomieos:v1")
        throw new DOMException("Full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await enterEmpty(page);
  await page.getByRole("button", { name: "Create my household" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Couldn't save changes" }),
  ).toBeVisible();
  await expect(page.getByLabel("Household name")).toHaveValue("Cedar House");
  await expect(page.getByLabel("Roommate 1 name")).toHaveValue("Alex");
  expect(await saved(page)).toBeNull();
  await page.evaluate(() =>
    (
      window as unknown as { allowRoomieosWrites: () => void }
    ).allowRoomieosWrites(),
  );
  await page.getByRole("button", { name: "Create my household" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cedar House",
  );
  // Use client navigation so the initial failure injection is not reinstalled on reload.
  await page
    .getByRole("link", { name: "Manage your household in Settings." })
    .click();
  const before = await saved(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, {
      allowRoomieosWrites: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByLabel("Household name").fill("Unsaved name");
  await page.getByRole("button", { name: "Save household" }).click();
  await expect(page.getByLabel("Household name")).toHaveValue("Unsaved name");
  expect(await saved(page)).toEqual(before);
  await page.evaluate(() =>
    (
      window as unknown as { allowRoomieosWrites: () => void }
    ).allowRoomieosWrites(),
  );
  await page.getByRole("button", { name: "Save household" }).click();
  await expect(page.getByRole("status")).toContainText("Household saved");
  expect((await saved(page))!.household.name).toBe("Unsaved name");
});

test("reset and start over require confirmation and retain data when storage fails", async ({
  page,
}) => {
  await sample(page);
  await settings(page);
  const original = await saved(page);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  let dialog = page.getByRole("dialog", {
    name: "Reset sample household?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await saved(page)).toEqual(original);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem,
      clear = Storage.prototype.removeItem;
    Object.assign(window, {
      allowRoomieosChanges: () => {
        Storage.prototype.setItem = write;
        Storage.prototype.removeItem = clear;
      },
    });
    Storage.prototype.setItem = function () {
      throw new Error("Full");
    };
    Storage.prototype.removeItem = function () {
      throw new Error("Blocked");
    };
  });
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await dialog.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Couldn't save");
  expect(await saved(page)).toEqual(original);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Start over?", exact: true });
  await dialog.getByRole("button", { name: "Erase household" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Couldn't clear");
  expect(await saved(page)).toEqual(original);
  await page.evaluate(() =>
    (
      window as unknown as { allowRoomieosChanges: () => void }
    ).allowRoomieosChanges(),
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByLabel("Household name").fill("Changed household");
  await page.getByRole("button", { name: "Save household" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  dialog = page.getByRole("dialog", {
    name: "Reset sample household?",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Household name")).toHaveValue("Maple House");
  expect((await saved(page))!.household.currency).toBe("USD");
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Start over?", exact: true });
  await dialog.getByRole("button", { name: "Erase household" }).click();
  await expect(page).toHaveURL(/\/welcome\/$/);
  expect(await saved(page)).toBeNull();
});

test("another tab cannot silently overwrite a draft or resurrect cleared data", async ({
  page,
  context,
}) => {
  await sample(page);
  await settings(page);
  const other = await context.newPage();
  await settings(other);
  await other.getByLabel("Household name").fill("Unsaved other-tab draft");
  await page.getByLabel("Household name").fill("Saved in first tab");
  await page.getByRole("button", { name: "Save household" }).click();
  await expect(
    other.getByRole("button", { name: "Reload saved household" }),
  ).toBeVisible();
  await expect(other.getByLabel("Household name")).toHaveValue(
    "Unsaved other-tab draft",
  );
  await expect(
    other.getByRole("button", { name: "Save household" }),
  ).toBeDisabled();
  await other.getByRole("button", { name: "Reload saved household" }).click();
  await expect(other.getByLabel("Household name")).toHaveValue(
    "Saved in first tab",
  );
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Start over?", exact: true })
    .getByRole("button", { name: "Erase household" })
    .click();
  await expect(
    other.getByRole("button", { name: "Reload saved household" }),
  ).toBeVisible();
  await other.getByRole("button", { name: "Reload saved household" }).click();
  await expect(other).toHaveURL(/\/welcome\/$/);
  expect(await saved(other)).toBeNull();
});
