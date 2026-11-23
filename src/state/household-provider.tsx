"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createHouseholdStore,
  initialSnapshot,
  STORAGE_KEY,
  type HouseholdStore,
} from "./household-store";

const HouseholdContext = createContext<HouseholdStore | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() =>
    createHouseholdStore(() => window.localStorage),
  );
  useEffect(() => {
    store.initialize();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        store.checkForExternalChange();
    };
    const onFocus = () => store.checkForExternalChange();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [store]);
  return (
    <HouseholdContext.Provider value={store}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const store = useContext(HouseholdContext);
  if (!store) throw new Error("HouseholdProvider is missing.");
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => initialSnapshot,
  );
  return { ...snapshot, store };
}

export function useReadyHousehold() {
  const household = useHousehold();
  if (!household.state)
    throw new Error("This view requires a loaded household.");
  return { ...household, state: household.state };
}
