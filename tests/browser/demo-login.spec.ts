import { expect, test, type Page } from "@playwright/test";
import { createSampleHousehold } from "../../src/domain/sample";

async function login(page: Page) {
  await page.getByLabel(/^Email/).fill("some.email@example.com");
  await page.getByLabel(/^Password/).fill("n0t4passw0rd$");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}
async function logoutButton(page: Page) {
  if (page.viewportSize()!.width < 1024)
    await page.getByRole("button", { name: "Open navigation" }).click();
  return page
    .getByRole("button", { name: "Log out of demo", exact: true })
    .filter({ visible: true });
}

test("landing, empty login and first-run setup are explicit", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your shared home,organized.",
  );
  await expect(page.getByText(/Saved in this browser only/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page.getByLabel(/^Email/)).toHaveValue("");
  const password = page.getByLabel(/^Password/);
  await expect(password).toHaveValue("");
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await expect(
    page.getByText("some.email@example.com", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel(/^Email/).fill("wrong@example.com");
  await password.fill("wrong-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /incorrect/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("roomieos:demo-login")),
  ).toBeNull();
  await login(page);
  await expect(page).toHaveURL(/\/welcome\/$/);
  expect(
    await page.evaluate(() => localStorage.getItem("roomieos:v1")),
  ).toBeNull();
  await expect(page.getByRole("radio", { name: /Explore/ })).not.toBeChecked();
  await expect(
    page.getByRole("radio", { name: /Start from scratch/ }),
  ).not.toBeChecked();
  await page.reload();
  await expect(page).toHaveURL(/\/welcome\/$/);
});

test("deep links, persistent login and cross-tab logout preserve the household", async ({
  page,
  context,
}) => {
  const state = createSampleHousehold(new Date());
  await context.addInitScript((saved) => {
    if (!localStorage.getItem("roomieos:v1"))
      localStorage.setItem("roomieos:v1", JSON.stringify(saved));
  }, state);
  await page.goto("/expenses/");
  await expect(page).toHaveURL(/\/login\/\?next=/);
  await expect(
    page.getByRole("heading", { name: "Expenses", exact: true }),
  ).toHaveCount(0);
  await login(page);
  await expect(page).toHaveURL(/\/expenses\/$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Expenses", exact: true }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/login/");
  await expect(other).toHaveURL(/\/dashboard\/$/);
  await (await logoutButton(page)).click();
  await expect(page).toHaveURL(/\/login\//);
  await expect(other).toHaveURL(/\/login\//);
  expect(await page.evaluate(() => localStorage.getItem("roomieos:v1"))).toBe(
    JSON.stringify(state),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Log in", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  await other.close();
});

test("login storage failures keep the form usable and logout failures retain access", async ({
  page,
}) => {
  await page.addInitScript((state) => {
    if (!localStorage.getItem("roomieos:v1"))
      localStorage.setItem("roomieos:v1", JSON.stringify(state));
  }, createSampleHousehold(new Date()));
  await page.goto("/login/");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "roomieos:demo-login") throw new Error("blocked");
      return original.call(this, key, value);
    };
    (window as unknown as { allowLogin: () => void }).allowLogin = () => {
      Storage.prototype.setItem = original;
    };
  });
  await login(page);
  await expect(
    page.getByRole("alert").filter({ hasText: /remember your demo login/ }),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { allowLogin: () => void }).allowLogin(),
  );
  await login(page);
  await expect(page).toHaveURL(/\/dashboard\/$/);
  await page.evaluate(() => {
    Storage.prototype.removeItem = () => {
      throw new Error("blocked");
    };
  });
  await (await logoutButton(page)).click();
  await expect(
    page.getByRole("alert").filter({ hasText: /Couldn't log out/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("roomieos:demo-login")),
  ).toBe("true");
});
