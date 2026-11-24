import { describe, expect, it } from "vitest";
import { createHouseholdStore, type StoragePort } from "./household-store";
import { createSampleHousehold } from "../domain/sample";
import { calculateBalances } from "../domain/money";
import type { ExpenseAction } from "../domain/expenses";

const now = new Date(2026, 10, 23, 12);
function harness(initial: string | null = null) {
  let raw = initial;
  let failRead = false,
    failWrite = false,
    failClear = false;
  let writes = 0;
  const storage: StoragePort = {
    getItem: () => {
      if (failRead) throw new Error("blocked");
      return raw;
    },
    setItem: (_key, value) => {
      if (failWrite) throw new Error("quota");
      raw = value;
      writes++;
    },
    removeItem: () => {
      if (failClear) throw new Error("blocked");
      raw = null;
    },
  };
  const store = createHouseholdStore(
    () => storage,
    () => "generated",
    () => now,
  );
  return {
    store,
    storage,
    raw: () => raw,
    writes: () => writes,
    external: (value: string | null) => {
      raw = value;
    },
    failReads: (value: boolean) => {
      failRead = value;
    },
    failWrites: (value: boolean) => {
      failWrite = value;
    },
    failClears: (value: boolean) => {
      failClear = value;
    },
  };
}

describe("browser persistence transaction", () => {
  it("saves agreement CRUD across refresh while retaining prior facts and drafts on a failed edit", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    expect(
      h.store.dispatch(
        {
          type: "add-agreement",
          agreement: { title: "Guests", details: "Ask first.\nKeep it calm." },
        },
        "Saved",
      ).ok,
    ).toBe(true);
    h.store.initialize();
    expect(h.store.getSnapshot().state!.agreements.at(-1)).toEqual({
      id: "generated",
      title: "Guests",
      details: "Ask first.\nKeep it calm.",
    });
    const raw = h.raw();
    const before = h.store.getSnapshot().state;
    h.failWrites(true);
    expect(
      h.store.dispatch(
        {
          type: "edit-agreement",
          id: "generated",
          agreement: { title: "Updated", details: "" },
        },
        "Saved",
      ).ok,
    ).toBe(false);
    expect(h.raw()).toBe(raw);
    expect(h.store.getSnapshot().state).toBe(before);
    expect(h.store.getSnapshot().notice).toBeNull();
    h.failWrites(false);
    expect(
      h.store.dispatch(
        {
          type: "edit-agreement",
          id: "generated",
          agreement: { title: "Updated", details: "" },
        },
        "Saved",
      ).ok,
    ).toBe(true);
    h.store.initialize();
    expect(h.store.getSnapshot().state!.agreements.at(-1)?.title).toBe(
      "Updated",
    );
    expect(
      h.store.dispatch({ type: "delete-agreement", id: "generated" }, "Deleted")
        .ok,
    ).toBe(true);
    h.store.initialize();
    expect(h.store.getSnapshot().state!.agreements).toHaveLength(3);
  });
  it("rejects stale agreement changes without overwriting an externally changed household", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const external = JSON.stringify({
      ...createSampleHousehold(now),
      agreements: [],
    });
    h.external(external);
    expect(
      h.store.dispatch({ type: "delete-agreement", id: "quiet" }, "Deleted").ok,
    ).toBe(false);
    expect(h.raw()).toBe(external);
    expect(h.store.getSnapshot().conflict).toBe(true);
  });
  it("persists expense settlement/reopen and restores exact balances after initialization", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const state = h.store.getSnapshot().state!;
    const before = calculateBalances(state.members, state.expenses);
    expect(
      h.store.dispatch(
        { type: "set-expense-status", id: "groceries", status: "settled" },
        "Settled",
      ).ok,
    ).toBe(true);
    h.store.initialize();
    expect(h.store.getSnapshot().state!.expenses[0].status).toBe("settled");
    expect(
      calculateBalances(state.members, h.store.getSnapshot().state!.expenses),
    ).not.toEqual(before);
    expect(
      h.store.dispatch(
        { type: "set-expense-status", id: "groceries", status: "open" },
        "Reopened",
      ).ok,
    ).toBe(true);
    const fresh = createHouseholdStore(() => h.storage);
    fresh.initialize();
    expect(
      calculateBalances(state.members, fresh.getSnapshot().state!.expenses),
    ).toEqual(before);
    expect(
      h.store.dispatch({ type: "delete-expense", id: "groceries" }, "Deleted")
        .ok,
    ).toBe(true);
    h.store.initialize();
    expect(
      h.store
        .getSnapshot()
        .state!.expenses.some((expense) => expense.id === "groceries"),
    ).toBe(false);
  });
  it("keeps expense records and balances unchanged on failed writes or invalid totals", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const state = h.store.getSnapshot().state!;
    const raw = h.raw();
    h.failWrites(true);
    const actions: ExpenseAction[] = [
      { type: "delete-expense", id: "groceries" },
      { type: "set-expense-status", id: "groceries", status: "settled" },
      {
        type: "add-expense",
        expense: {
          description: "Failed add",
          amountCents: 100,
          date: "2026-11-23",
          category: "Other",
          notes: "",
          payers: [{ memberId: "avery", amountCents: 100 }],
          participants: [{ memberId: "sam", amountCents: 100 }],
          splitMethod: "equal",
        },
      },
    ];
    for (const action of actions) {
      expect(h.store.dispatch(action, "Saved").ok).toBe(false);
      expect(h.raw()).toBe(raw);
      expect(h.store.getSnapshot().state).toBe(state);
      expect(h.store.getSnapshot().notice).toBeNull();
    }
    h.failWrites(false);
    const invalid = { ...actions[2] } as Extract<
      ExpenseAction,
      { type: "add-expense" }
    >;
    invalid.expense = { ...invalid.expense, amountCents: 101 };
    expect(h.store.dispatch(invalid, "Saved").ok).toBe(false);
    expect(h.raw()).toBe(raw);
    expect(h.store.dispatch(actions[1], "Settled").ok).toBe(true);
  });
  it("rejects expense changes from a stale tab even before the storage event is delivered", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const external = JSON.stringify({
      ...createSampleHousehold(now),
      expenses: [],
    });
    h.external(external);
    expect(
      h.store.dispatch(
        { type: "set-expense-status", id: "groceries", status: "settled" },
        "Settled",
      ).ok,
    ).toBe(false);
    expect(h.raw()).toBe(external);
    expect(h.store.getSnapshot().conflict).toBe(true);
  });
  it("persists chore completion identity/history, rotation and deletion across reloads", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    h.store.dispatch({ type: "select-member", id: "sam" }, "Switched");
    expect(
      h.store.dispatch(
        { type: "set-chore-status", id: "kitchen", status: "completed" },
        "Completed",
      ).ok,
    ).toBe(true);
    const event = h.store.getSnapshot().state!.chores[0].completionHistory[0];
    expect(event.completedById).toBe("sam");
    expect(
      h.store.dispatch(
        { type: "rotate-chore", id: "kitchen", dueDate: "2026-12-01" },
        "Rotated",
      ).ok,
    ).toBe(true);
    h.store.initialize();
    expect(h.store.getSnapshot().state!.chores[0]).toMatchObject({
      assigneeId: "jordan",
      status: "pending",
      dueDate: "2026-12-01",
      completionHistory: [event],
    });
    expect(
      h.store.dispatch({ type: "delete-chore", id: "kitchen" }, "Deleted").ok,
    ).toBe(true);
    h.store.initialize();
    expect(
      h.store
        .getSnapshot()
        .state!.chores.some((chore) => chore.id === "kitchen"),
    ).toBe(false);
  });
  it("keeps chore state/history unchanged on failed writes and allows retry", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const before = h.raw();
    h.failWrites(true);
    expect(
      h.store.dispatch(
        { type: "set-chore-status", id: "kitchen", status: "completed" },
        "Completed",
      ).ok,
    ).toBe(false);
    expect(h.store.getSnapshot().state!.chores[0].completionHistory).toEqual(
      [],
    );
    expect(h.store.getSnapshot().notice).toBeNull();
    expect(h.raw()).toBe(before);
    h.failWrites(false);
    expect(
      h.store.dispatch(
        { type: "set-chore-status", id: "kitchen", status: "completed" },
        "Completed",
      ).ok,
    ).toBe(true);
    expect(
      h.store.getSnapshot().state!.chores[0].completionHistory,
    ).toHaveLength(1);
  });
  it("rejects chore changes from a stale tab without replacing external data", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const external = JSON.stringify({
      ...createSampleHousehold(now),
      chores: [],
    });
    h.external(external);
    expect(
      h.store.dispatch({ type: "delete-chore", id: "kitchen" }, "Deleted").ok,
    ).toBe(false);
    expect(h.raw()).toBe(external);
    expect(h.store.getSnapshot().conflict).toBe(true);
  });
  it("does not seed or write during initialization, including repeated initialization", () => {
    const h = harness();
    expect(h.store.getSnapshot().status).toBe("loading");
    h.store.initialize();
    h.store.initialize();
    expect(h.store.getSnapshot().status).toBe("empty");
    expect(h.raw()).toBeNull();
    expect(h.writes()).toBe(0);
    expect(h.store.sample("USD").ok).toBe(true);
    const saved = h.raw();
    h.store.initialize();
    expect(h.raw()).toBe(saved);
    expect(h.writes()).toBe(1);
  });
  it("persists before notifying subscribers and retains all modified facts after refresh", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("EUR");
    const savedFacts = h.store.getSnapshot().state!;
    const unsubscribe = h.store.subscribe(() => {
      const snapshot = h.store.getSnapshot();
      if (snapshot.state?.household.name === "New name")
        expect(JSON.parse(h.raw()!).household.name).toBe("New name");
    });
    h.store.dispatch(
      { type: "update-household", name: "New name", currency: "EUR" },
      "Saved",
    );
    h.store.dispatch({ type: "select-member", id: "jordan" }, "Switched");
    unsubscribe();
    const refreshed = createHouseholdStore(() => h.storage);
    refreshed.initialize();
    expect(refreshed.getSnapshot().state).toEqual({
      ...savedFacts,
      household: { name: "New name", currency: "EUR" },
      selectedMemberId: "jordan",
    });
  });
  it.each(["{bad json", JSON.stringify({ schemaVersion: 99 }), "null", ""])(
    "keeps invalid data untouched until an explicit clear (%s)",
    (raw) => {
      const h = harness(raw);
      h.store.initialize();
      expect(h.store.getSnapshot().status).toBe("invalid");
      expect(h.store.sample("CAD").ok).toBe(false);
      expect(h.raw()).toBe(raw);
      expect(h.writes()).toBe(0);
      expect(h.store.clear().ok).toBe(true);
      expect(h.raw()).toBeNull();
      expect(h.store.getSnapshot().status).toBe("empty");
    },
  );
  it("supports retry after storage reads are blocked", () => {
    const h = harness();
    h.failReads(true);
    h.store.initialize();
    expect(h.store.getSnapshot().status).toBe("unavailable");
    h.failReads(false);
    h.store.initialize();
    expect(h.store.getSnapshot().status).toBe("empty");
  });
  it("does not publish failed writes or show a successful save", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const previous = h.store.getSnapshot().state;
    const raw = h.raw();
    h.failWrites(true);
    const result = h.store.dispatch(
      {
        type: "edit-member",
        id: "avery",
        member: { name: "Changed", avatar: { kind: "initials", value: "" } },
      },
      "Saved",
    );
    expect(result.ok).toBe(false);
    expect(h.store.getSnapshot().state).toBe(previous);
    expect(h.store.getSnapshot().notice).toBeNull();
    expect(h.raw()).toBe(raw);
    h.failWrites(false);
    expect(
      h.store.dispatch({ type: "select-member", id: "jordan" }, "Switched").ok,
    ).toBe(true);
  });
  it("retains the household on failed start-over and reset writes", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const raw = h.raw();
    h.failClears(true);
    expect(h.store.clear().ok).toBe(false);
    expect(h.raw()).toBe(raw);
    h.failWrites(true);
    expect(h.store.sample("CAD", true).ok).toBe(false);
    expect(h.raw()).toBe(raw);
    expect(h.store.getSnapshot().status).toBe("ready");
  });
  it("blocks stale writes even before a storage event is delivered", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    const external = JSON.stringify({
      ...createSampleHousehold(now),
      household: { name: "Another tab", currency: "CAD" },
    });
    h.external(external);
    expect(
      h.store.dispatch({ type: "select-member", id: "jordan" }, "Switched").ok,
    ).toBe(false);
    expect(h.raw()).toBe(external);
    expect(h.store.getSnapshot().conflict).toBe(true);
    expect(h.store.clear().ok).toBe(false);
    h.store.initialize();
    expect(h.store.getSnapshot().state?.household.name).toBe("Another tab");
    expect(h.store.getSnapshot().conflict).toBe(false);
  });
  it("detects external removal and does not resurrect the household", () => {
    const h = harness();
    h.store.initialize();
    h.store.sample("CAD");
    h.external(null);
    h.store.checkForExternalChange();
    expect(h.store.getSnapshot().conflict).toBe(true);
    expect(h.store.sample("CAD", true).ok).toBe(false);
    expect(h.raw()).toBeNull();
  });
});
