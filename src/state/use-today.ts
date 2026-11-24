"use client";

import { useSyncExternalStore } from "react";
import { localDate } from "@/domain/dates";

function subscribeDate(listener: () => void) {
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  document.addEventListener("pointerdown", listener);
  document.addEventListener("keydown", listener);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
    document.removeEventListener("pointerdown", listener);
    document.removeEventListener("keydown", listener);
  };
}

export function useToday() {
  return useSyncExternalStore(
    subscribeDate,
    () => localDate(new Date()),
    () => "",
  );
}
