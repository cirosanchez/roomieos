import { expect, type Locator, type Page } from "@playwright/test";
export async function selectControl(
  locator: Locator,
  option: string | { label: string },
) {
  await locator.click();
  const options = locator.page().getByRole("option");
  const item = options.getByText(
    typeof option === "string" ? option : option.label,
    { exact: true },
  );
  if (typeof option === "string")
    await locator
      .page()
      .locator(`[role="option"][data-value=${JSON.stringify(option)}]`)
      .filter({ visible: true })
      .click();
  else await item.click();
}
export async function expectControlValue(
  locator: Locator,
  value: string | RegExp,
) {
  if (await locator.evaluate((el) => el.tagName === "BUTTON"))
    await expect(locator).toHaveAttribute("data-value", value);
  else await expect(locator).toHaveValue(value);
}
export function getDialog(
  scope: Page | Locator,
  options?: { name?: string | RegExp; exact?: boolean },
) {
  return scope
    .getByRole("dialog", options)
    .or(scope.getByRole("alertdialog", options));
}
export async function selectItems(locator: Locator) {
  await locator.click();
  return locator.page().getByRole("option");
}
