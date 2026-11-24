import { describe, expect, it } from "vitest";
import { applyAgreementAction, type AgreementAction } from "./agreements";
import { createSampleHousehold } from "./sample";

const sample = () => createSampleHousehold(new Date(2026, 10, 24, 12));
function act(action: AgreementAction) {
  return applyAgreementAction(sample(), action, () => "new-agreement");
}
describe("house agreement facts", () => {
  it("creates a trimmed title, preserves multiline details and leaves unrelated facts unchanged", () => {
    const state = sample();
    const next = applyAgreementAction(
      state,
      {
        type: "add-agreement",
        agreement: {
          title: "  Quiet weekends  ",
          details: "Keep it calm.\n  Ask before a party.  ",
        },
      },
      () => "new-agreement",
    );
    expect(next.agreements.at(-1)).toEqual({
      id: "new-agreement",
      title: "Quiet weekends",
      details: "Keep it calm.\n  Ask before a party.  ",
    });
    expect(state.agreements).toHaveLength(3);
    expect({ ...next, agreements: state.agreements }).toEqual(state);
  });
  it("edits only the selected agreement, keeps its identity/order and allows empty details", () => {
    const state = sample();
    const next = applyAgreementAction(
      state,
      {
        type: "edit-agreement",
        id: "quiet",
        agreement: { title: "Evening noise", details: "" },
      },
      () => {
        throw new Error("An edit must not request a new ID.");
      },
    );
    expect(next.agreements[0]).toEqual({
      id: "quiet",
      title: "Evening noise",
      details: "",
    });
    expect(next.agreements.slice(1)).toEqual(state.agreements.slice(1));
    expect(state.agreements[0].title).toBe("Quiet hours");
  });
  it("deletes exactly one agreement", () => {
    expect(act({ type: "delete-agreement", id: "quiet" }).agreements).toEqual(
      sample().agreements.slice(1),
    );
  });
  it.each([
    { title: "", details: "" },
    { title: "  ", details: "" },
    { title: "x".repeat(101), details: "" },
    { title: "Valid", details: "x".repeat(1001) },
  ])("rejects invalid create/edit input (%j)", (agreement) => {
    expect(() => act({ type: "add-agreement", agreement })).toThrow();
    expect(() =>
      act({ type: "edit-agreement", id: "quiet", agreement }),
    ).toThrow();
  });
  it("accepts the exact title/details limits", () => {
    expect(
      act({
        type: "add-agreement",
        agreement: { title: "x".repeat(100), details: "y".repeat(1000) },
      }).agreements.at(-1)?.details,
    ).toHaveLength(1000);
  });
  it.each(["edit-agreement", "delete-agreement"] as const)(
    "rejects missing records for %s",
    (type) => {
      expect(() =>
        act(
          type === "edit-agreement"
            ? { type, id: "missing", agreement: { title: "New", details: "" } }
            : { type, id: "missing" },
        ),
      ).toThrow(/could not be found/);
    },
  );
});
