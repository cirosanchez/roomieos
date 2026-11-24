import { describe, expect, it } from "vitest";
import { createHouseholdStore, type StoragePort } from "./household-store";
import { createSampleHousehold } from "../domain/sample";

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
