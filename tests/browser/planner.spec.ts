import { test, expect } from "./fixtures";
import { createSampleHousehold } from "../../src/domain/sample";
import { getDialog } from "./ui-controls";
test.beforeEach(async ({ page }) => {
  const state = createSampleHousehold(new Date());
  await page.addInitScript((s) => {
    if (!localStorage.getItem("roomieos:v1"))
      localStorage.setItem("roomieos:v1", JSON.stringify(s));
  }, state);
  await page.goto("/planner");
  await expect(
    page.getByRole("heading", { name: "Planner", exact: true }),
  ).toBeVisible();
});
test("calendar stays contained, provides day/week and overnight stays", async ({
  page,
}, info) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(
    page
      .getByRole("button", { name: "Guest visit: Maya", exact: false })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Day", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await page.screenshot({
    path: `/tmp/roomieos-planner-${info.project.name}.png`,
    fullPage: true,
  });
});
test("new events persist, edit and delete", async ({ page }) => {
  await page.getByRole("button", { name: "New event", exact: true }).click();
  const form = getDialog(page, { name: "New event", exact: true });
  await form.getByLabel("Guest names").fill("Taylor");
  await form.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.reload();
  await page.getByText(/Events for this/).click();
  await page
    .getByRole("button", { name: /Guest visit: Taylor/ })
    .last()
    .click();
  let details = getDialog(page, { name: "Taylor", exact: true });
  await details.getByRole("button", { name: "Edit event" }).click();
  const edit = getDialog(page, { name: "Edit event", exact: true });
  await edit.getByLabel("Guest names").fill("Taylor and Lee");
  await edit.getByRole("button", { name: "Save event", exact: true }).click();
  await page
    .getByRole("button", { name: /Guest visit: Taylor and Lee/ })
    .last()
    .click();
  details = getDialog(page, { name: "Taylor and Lee", exact: true });
  await details
    .getByRole("button", { name: "Delete event", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete event", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("roomieos:v1")!).plannerEvents.some(
        (e: { title: string }) => e.title === "Taylor and Lee",
      ),
    ),
  ).toBe(false);
});
test("quiet overlaps need explicit confirmation; dirty drafts are protected", async ({
  page,
}) => {
  await page.getByRole("button", { name: "New event", exact: true }).click();
  const form = getDialog(page, { name: "New event", exact: true });
  await form.getByLabel("Guest names").fill("Late visitor");
  await form.getByLabel("Start time").fill("21:00");
  await form.getByLabel("End time").fill("22:00");
  await form.getByRole("button", { name: "Save event", exact: true }).click();
  const warning = page.getByRole("alertdialog", { name: "Overlapping events" });
  await expect(warning).toContainText("Exam study");
  await warning.getByRole("button", { name: "Keep editing" }).click();
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Keep editing" })
    .click();
  await form.getByRole("button", { name: "Save event", exact: true }).click();
  await warning.getByRole("button", { name: "Save anyway" }).click();
  await expect(form).not.toBeVisible();
});
test("space management validates duplicate names", async ({ page }) => {
  const options = page.getByRole("button", {
    name: "Calendar options",
    exact: true,
  });
  if (await options.isVisible()) await options.click();
  await page
    .getByRole("button", { name: "Manage spaces", exact: true })
    .filter({ visible: true })
    .click();
  const dialog = getDialog(page, { name: "Manage spaces", exact: true });
  await dialog.getByLabel("New space name").fill("Study nook");
  await dialog.getByRole("button", { name: "Add space" }).click();
  await expect(dialog.getByText("Study nook", { exact: true })).toBeVisible();
  await dialog.getByLabel("New space name").fill("KITCHEN");
  await dialog.getByRole("button", { name: "Add space" }).click();
  await expect(dialog.getByRole("alert")).toContainText("unique");
});
