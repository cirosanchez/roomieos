import { test as base } from "@playwright/test";
export * from "@playwright/test";

// Existing workspace tests start past the independently tested demo login.
export const test = base.extend({
  context: async ({ context }, runFixture) => {
    await context.addInitScript(() => {
      localStorage.setItem("roomieos:demo-login", "true");
    });
    await runFixture(context);
  },
});
