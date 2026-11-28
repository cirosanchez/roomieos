import { expectChoreStatus } from "./ui-controls";
import { expect, test, type Page } from "./fixtures";
import { selectControl } from "./ui-controls";
import { createSampleHousehold } from "../../src/domain/sample";
import type { AppState } from "../../src/domain/types";

async function seed(page: Page, state = createSampleHousehold(new Date())) {
  await page.addInitScript((state) => {
    if (!localStorage.getItem("roomieos:v1"))
      localStorage.setItem("roomieos:v1", JSON.stringify(state));
  }, state);
  await page.goto("/chores/");
  await expect(
    page.getByRole("heading", { name: "Chores", exact: true }),
  ).toBeVisible();
}
async function saved(page: Page): Promise<AppState> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("roomieos:v1")!));
}
function handle(page: Page) {
  return page.getByRole("button", {
    name: "Drag Clean the kitchen",
    exact: true,
  });
}
async function mouseMove(page: Page, column: string) {
  await handle(page).scrollIntoViewIfNeeded();
  const start = (await handle(page).boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    start.x + start.width / 2 + 12,
    start.y + start.height / 2,
    { steps: 3 },
  );
  const target = page.locator(`[data-chore-column="${column}"] h2`);
  await target.scrollIntoViewIfNeeded();
  const end = (await target.boundingBox())!;
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}

test("pointer drops persist, write completion history once, and update status tags", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  const original = await saved(page);
  const id = original.chores[0].id;
  await mouseMove(page, "completed");
  await expect
    .poll(
      async () => (await saved(page)).chores.find((c) => c.id === id)?.status,
    )
    .toBe("completed");
  const chore = (await saved(page)).chores.find((c) => c.id === id)!;
  expect(chore.completionHistory).toHaveLength(1);
  expect(chore.completionHistory[0].completedById).toBe(
    original.selectedMemberId,
  );
  await mouseMove(page, "completed");
  expect(
    (await saved(page)).chores.find((c) => c.id === id)?.completionHistory,
  ).toHaveLength(1);
  await mouseMove(page, "pending");
  expect(
    (await saved(page)).chores.find((c) => c.id === id)?.completionHistory,
  ).toEqual(chore.completionHistory);
  await expectChoreStatus(page, "Clean the kitchen", "pending");
  await page.reload();
  await expect(handle(page)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("draggable-board.png"),
    fullPage: true,
  });
  expect(await page.evaluate(() => innerWidth)).toBe(
    page.viewportSize()!.width,
  );
  expect(errors).toEqual([]);
});

test("keyboard moves into empty columns and Escape cancels without saving", async ({
  page,
}) => {
  const state = createSampleHousehold(new Date());
  state.chores = [state.chores[0]];
  await seed(page, state);
  const before = await saved(page);
  await handle(page).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-chore-column="completed"]')).toHaveClass(
    /border-accent/,
  );
  await page.keyboard.press("Escape");
  expect(await saved(page)).toEqual(before);
  await handle(page).press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => (await saved(page)).chores[0].status)
    .toBe("completed");
  await expect(handle(page)).toBeFocused();
  await handle(page).press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await saved(page)).chores[0].status)
    .toBe("skipped");
  expect((await saved(page)).chores[0].completionHistory).toHaveLength(1);
});

test("failed saves leave the card in place and retry creates one completion", async ({
  page,
}) => {
  await seed(page);
  const before = await saved(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, "restoreWrites", {
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function () {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await mouseMove(page, "completed");
  expect(await saved(page)).toEqual(before);
  await expect(
    page
      .getByText(/could not save|unable to save|storage.*full|couldn't save/i)
      .first(),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { restoreWrites: () => void }).restoreWrites();
  });
  await mouseMove(page, "completed");
  await expect
    .poll(async () => (await saved(page)).chores[0].completionHistory.length)
    .toBe(1);
});

test("archived assignments stay outside active roommates' boards", async ({
  page,
}) => {
  const state = createSampleHousehold(new Date());
  state.members[0].active = false;
  state.selectedMemberId = "jordan";
  state.expenses = [];
  for (const chore of state.chores)
    if (chore.assigneeId === "avery") chore.status = "skipped";
  await seed(page, state);
  const before = await saved(page);
  await expect(handle(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Take out recycling", exact: true }),
  ).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test("touch dragging scrolls the board and drops in another column", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "phone",
    "Real touch gesture is exercised on the phone viewport.",
  );
  const state = createSampleHousehold(new Date());
  state.chores = [state.chores[0]];
  await seed(page, state);
  await handle(page).scrollIntoViewIfNeeded();
  const bounds = (await handle(page).boundingBox())!;
  const board = page.getByRole("region", { name: "Chore board", exact: true });
  const viewport = (await board.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const y = bounds.y + bounds.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: bounds.x + bounds.width / 2, y }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: viewport.x + viewport.width - 12, y }],
  });
  await expect
    .poll(() => board.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(200);
  const target = page.locator('[data-chore-column="completed"]');
  const box = (await target.boundingBox())!;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      {
        x: Math.max(
          viewport.x + 60,
          Math.min(viewport.x + viewport.width - 60, box.x + box.width / 2),
        ),
        y,
      },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => (await saved(page)).chores[0].status)
    .toBe("completed");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("dropping outside the board leaves the saved household unchanged", async ({
  page,
}) => {
  await seed(page);
  const before = await saved(page);
  await handle(page).scrollIntoViewIfNeeded();
  const box = (await handle(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2, {
    steps: 3,
  });
  await page.mouse.move(page.viewportSize()!.width - 20, 20, { steps: 10 });
  await page.mouse.up();
  expect(await saved(page)).toEqual(before);
  await expect(handle(page)).toHaveAttribute("aria-pressed", "false");
});

test("switching perspective cancels a pending keyboard move and preserves all chore records", async ({
  page,
}) => {
  const state = createSampleHousehold(new Date());
  state.chores = [state.chores[0]];
  await seed(page, state);
  await handle(page).press("Space");
  await page.keyboard.press("ArrowRight");
  await selectControl(page.getByLabel("Switch demo perspective"), "sam");
  await expect(
    page.getByText("No chores assigned to Sam", { exact: true }),
  ).toBeVisible();
  expect((await saved(page)).chores).toEqual(state.chores);
  await page.reload();
  await expect(
    page.getByText("No chores assigned to Sam", { exact: true }),
  ).toBeVisible();
  await selectControl(page.getByLabel("Switch demo perspective"), "avery");
  await expectChoreStatus(page, "Clean the kitchen", "pending");
  await expect(handle(page)).toHaveAttribute("aria-pressed", "false");
});
