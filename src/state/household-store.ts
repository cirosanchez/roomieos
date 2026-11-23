import { ZodError } from "zod";
import {
  applyHouseholdAction,
  createEmptyHousehold,
  type HouseholdAction,
  type SetupInput,
} from "../domain/household";
import { createSampleHousehold } from "../domain/sample";
import { validateState } from "../domain/validation";
import type { AppState, Currency } from "../domain/types";

export const STORAGE_KEY = "roomieos:v1";
export type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CommandResult = { ok: true } | { ok: false; error: string };
export type HouseholdSnapshot = {
  status: "loading" | "empty" | "ready" | "invalid" | "unavailable";
  state: AppState | null;
  error: string | null;
  conflict: boolean;
  notice: string | null;
};
export const initialSnapshot: HouseholdSnapshot = {
  status: "loading",
  state: null,
  error: null,
  conflict: false,
  notice: null,
};

export function createHouseholdStore(
  getStorage: () => StoragePort,
  makeId = () => crypto.randomUUID(),
  now = () => new Date(),
) {
  let snapshot = initialSnapshot;
  let lastRaw: string | null = null;
  const listeners = new Set<() => void>();
  const publish = (changes: Partial<HouseholdSnapshot>) => {
    snapshot = { ...snapshot, ...changes };
    listeners.forEach((listener) => listener());
  };
  const failure = (message: string): CommandResult => {
    publish({ error: message, notice: null });
    return { ok: false, error: message };
  };
  const messageFor = (error: unknown) =>
    error instanceof ZodError
      ? (error.issues[0]?.message ?? "Check the form and try again.")
      : error instanceof Error
        ? error.message
        : "The change could not be saved. Try again.";

  function initialize() {
    let raw: string | null;
    try {
      raw = getStorage().getItem(STORAGE_KEY);
    } catch {
      publish({
        status: "unavailable",
        state: null,
        error:
          "Browser storage is unavailable. Allow site storage and try again. Your saved data has not been replaced.",
        conflict: false,
        notice: null,
      });
      return;
    }
    lastRaw = raw;
    if (raw === null) {
      publish({
        status: "empty",
        state: null,
        error: null,
        conflict: false,
        notice: null,
      });
      return;
    }
    try {
      const state = validateState(JSON.parse(raw));
      publish({
        status: "ready",
        state,
        error: null,
        conflict: false,
        notice: null,
      });
    } catch {
      publish({
        status: "invalid",
        state: null,
        error:
          "Saved data couldn't be opened. It may be damaged or from an unsupported version. Nothing has been overwritten.",
        conflict: false,
        notice: null,
      });
    }
  }

  function checkCurrent(storage: StoragePort) {
    if (snapshot.conflict || storage.getItem(STORAGE_KEY) !== lastRaw) {
      publish({ conflict: true });
      throw new Error(
        "This household changed in another tab. Reload the saved household before making more changes.",
      );
    }
  }

  function write(next: AppState, notice: string): CommandResult {
    let state: AppState;
    try {
      state = validateState(next);
    } catch (error) {
      return failure(messageFor(error));
    }
    let storage: StoragePort;
    try {
      storage = getStorage();
      checkCurrent(storage);
    } catch (error) {
      return failure(
        snapshot.conflict
          ? messageFor(error)
          : "Couldn't access browser storage. Your change has not been saved. Allow site storage and retry.",
      );
    }
    const raw = JSON.stringify(state);
    try {
      storage.setItem(STORAGE_KEY, raw);
    } catch {
      return failure(
        "Couldn't save changes. Browser storage may be full or blocked. Your previous household and form entries are unchanged. Free some space or allow site storage, then retry.",
      );
    }
    lastRaw = raw;
    publish({ status: "ready", state, error: null, notice, conflict: false });
    return { ok: true };
  }

  function dispatch(action: HouseholdAction, notice: string): CommandResult {
    if (snapshot.status !== "ready" || !snapshot.state)
      return failure("Open a valid household before making changes.");
    try {
      return write(
        applyHouseholdAction(snapshot.state, action, makeId),
        notice,
      );
    } catch (error) {
      return failure(messageFor(error));
    }
  }

  function setup(input: SetupInput): CommandResult {
    if (snapshot.status !== "empty")
      return failure(
        "A saved household already exists. Open it or use Start over in Settings.",
      );
    try {
      return write(
        createEmptyHousehold(input, makeId),
        "Your household is ready.",
      );
    } catch (error) {
      return failure(messageFor(error));
    }
  }

  function sample(currency: Currency, reset = false): CommandResult {
    if (
      (!reset && snapshot.status !== "empty") ||
      (reset && snapshot.status !== "ready")
    )
      return failure(
        "Open the household before resetting, or start from the welcome screen.",
      );
    return write(
      createSampleHousehold(now(), currency),
      reset ? "Sample household restored." : "Welcome to Maple House.",
    );
  }

  function clear(): CommandResult {
    if (snapshot.status !== "ready" && snapshot.status !== "invalid")
      return failure("No household is available to clear.");
    try {
      const storage = getStorage();
      checkCurrent(storage);
      storage.removeItem(STORAGE_KEY);
    } catch (error) {
      return failure(
        snapshot.conflict
          ? messageFor(error)
          : "Couldn't clear saved data. Allow browser storage and try again. Your household has been kept.",
      );
    }
    lastRaw = null;
    publish({
      status: "empty",
      state: null,
      error: null,
      conflict: false,
      notice: "Saved household cleared.",
    });
    return { ok: true };
  }

  function checkForExternalChange() {
    if (snapshot.status === "loading" || snapshot.status === "unavailable")
      return;
    try {
      if (getStorage().getItem(STORAGE_KEY) !== lastRaw)
        publish({ conflict: true, notice: null });
    } catch {
      publish({
        error:
          "Couldn't check browser storage. Saving will verify it again before applying any change.",
        notice: null,
      });
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    initialize,
    dispatch,
    setup,
    sample,
    clear,
    checkForExternalChange,
    dismissFeedback: () => publish({ error: null, notice: null }),
  };
}

export type HouseholdStore = ReturnType<typeof createHouseholdStore>;
