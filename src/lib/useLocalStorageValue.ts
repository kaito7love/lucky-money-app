"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Reads a localStorage key via useSyncExternalStore instead of the
 * `useState` + `useEffect(() => setState(localStorage.getItem(...)))`
 * pattern — that pattern reads a browser-only API during an effect just to
 * push it into state, which both mismatches SSR and trips the
 * react-hooks/set-state-in-effect rule. Returns undefined until mounted on
 * the client (the server snapshot), then the stored value or null.
 */
export function useLocalStorageValue(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(key),
    () => undefined
  );
}
