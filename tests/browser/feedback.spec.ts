import { expect, test, type Page } from "./fixtures";
import { createSampleHousehold } from "../../src/domain/sample";

async function switchPerspective(page: Page, id: string) {
  await page.getByRole("button", { name: "Switch demo perspective" }).click();
  // Let the menu's animation-frame positioning run while the clock is paused.
  await page.clock.runFor(50);
  await page.locator(`[role="menuitemradio"][data-value="${id}"]`).click();
  await page.clock.runFor(16);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    if (!localStorage.getItem("roomieos:v1"))
      localStorage.setItem("roomieos:v1", JSON.stringify(state));
  }, createSampleHousehold(new Date()));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto("/dashboard/");
});

test("feedback sits bottom-right, expires after 3 seconds and restarts for repeated messages", async ({
  page,
}, testInfo) => {
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  const originalHeading = await heading.boundingBox();
  const perspective = page.getByRole("button", {
    name: "Switch demo perspective",
  });
  await switchPerspective(page, "sam");
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Demo perspective changed." });
  await expect(notice).toBeVisible();
  const box = (await notice.locator("..").boundingBox())!;
  expect(page.viewportSize()!.width - box.x - box.width).toBeCloseTo(16, 0);
  expect(page.viewportSize()!.height - box.y - box.height).toBeCloseTo(16, 0);
  expect((await heading.boundingBox())!.y).toBe(originalHeading!.y);
  await page.screenshot({ path: testInfo.outputPath("feedback-toast.png") });
  await page.clock.runFor(2500);
  await expect(notice).toBeVisible();
  await switchPerspective(page, "jordan");
  await page.clock.runFor(1000);
  await expect(notice).toBeVisible();
  await page.clock.runFor(1500);
  await expect(notice).toBeVisible();
  await page.clock.runFor(500);
  await expect(notice).not.toBeVisible();
  await switchPerspective(page, "avery");
  await expect(notice).toBeVisible();
  await page.getByRole("button", { name: "Dismiss message" }).click();
  await expect(notice).not.toBeVisible();
  await page.clock.runFor(3000);
  await expect(perspective).toHaveAttribute("data-value", "avery");
});

test("failed-save feedback expires while saved state stays intact", async ({
  page,
}) => {
  const original = await page.evaluate(() =>
    localStorage.getItem("roomieos:v1"),
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    };
  });
  const perspective = page.getByRole("button", {
    name: "Switch demo perspective",
  });
  await switchPerspective(page, "sam");
  const error = page.getByRole("alert").filter({ hasText: /save|storage/i });
  await expect(error).toBeVisible();
  await expect(perspective).toHaveAttribute("data-value", "avery");
  await page.clock.runFor(3000);
  await expect(error).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
    original,
  );
});
