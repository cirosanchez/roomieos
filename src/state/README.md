# Household state boundary

`HouseholdProvider` lives in the root layout above both Welcome and household routes. It owns one external store consumed through `useSyncExternalStore`, with a stable loading snapshot for server rendering and initial hydration. Feature components keep temporary form drafts locally.

`household-store.ts` accepts a storage getter, ID factory and clock so transactions can be tested without React or a browser. Initialization reads and validates `roomieos:v1` without writing or seeding. Commands derive a new state with pure domain functions, validate it, compare the stored payload with the last observed payload, persist, then notify subscribers. Failed writes retain the last saved state. Invalid data stays untouched until confirmed clearing; storage failures are explicit.

`HouseholdGate` handles loading, setup redirects, recovery and cross-tab reload notices. Storage events and window focus detect external changes; every write checks again before saving. Conflict reloads are user initiated, not automatic synchronization. No derived dashboard totals or balances are persisted.
