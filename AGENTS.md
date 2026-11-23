# RoomieOS — Codex repository instructions

## Mission and source of truth

Build **RoomieOS**, a polished, accessible **client-side prototype** for university students living with roommates. The app coordinates chores, shared expenses and household agreements. It is an ENTI 407 Creation Project with a Friday, 27 November 2026 deadline.

Read the relevant sections of:
- `docs/PRD.md` — product requirements, decisions, invariants and acceptance criteria. **Authoritative for behavior.**
- `docs/DESIGN.md` — visual language, navigation, components and responsive behavior. **Authoritative for UI/UX.**
- `PLAN.md` — approved architecture, implementation milestones, decisions and verification progress. **Authoritative for sequencing and progress.**

These files contain the agreed decisions. Don't redesign features based on assumptions, or rewrite these documents unless the user explicitly asks. For a small scoped change, consult only the relevant sections rather than repeatedly reading every line.

Read `PLAN.md` before implementation. Follow its approved milestones and update progress, actual verification results, blockers and approved decisions after each working slice. `docs/PRD.md` remains authoritative for behavior and `docs/DESIGN.md` for UI/UX; `PLAN.md` governs sequencing and progress. Surface conflicts rather than inventing requirements or silently expanding scope. Do not mark unchecked behavior as verified. Routine progress updates to `PLAN.md` are expected; changes to approved scope or decisions require user approval.

## Hard scope constraints

- Stack: **Next.js + TypeScript + Tailwind CSS + Lucide icons (`lucide-react`)**; deploy on **Vercel**.
- Persist a single versioned household in **browser `localStorage`**, key `roomieos:v1`.
- **No backend, database service, authentication, user accounts, cloud storage, WebSockets, API keys, third-party AI, analytics or network integrations.**
- **No fake collaboration.** A profile switcher represents a *local demo perspective*, not a real authenticated roommate.
- **No actual money transfers.** Expense settlement is a manual whole-expense marker; don't imply an integrated payment system.
- One household; **2–5 active roommates**. First-run must explicitly offer **sample household** or **empty household setup**.
- Essential screens: Dashboard, Chores (List + Kanban), Expenses, Agreements, Settings, and first-run Welcome.
- Household currency (CAD, USD, EUR, GBP) is chosen by the user; no exchange-rate calculation. Block currency changes while any expenses exist.
- No activity feed, scheduled/background jobs, push notifications, drag-and-drop dependency, or additional features beyond PRD without approval.

## Rules that must not be broken

1. **Do all expense arithmetic in integer cents.** Payer contributions and participant shares must separately sum exactly to total. Never use floating-point totals for stored financial amounts.
2. Support **multiple payers** and all three participant split modes: equal, percentage, fixed. Use deterministic cent-allocation and validate every form.
3. Only **open** expenses contribute to member net balances. `memberNet = totalPaid - totalShare`. Sum of nets must be zero. Debt simplification should preserve amounts and avoid invented payments.
4. **Settling an expense means fully resolved outside the app**, excludes its net from outstanding balances, retains the record, and can be undone.
5. Chore states are **pending, completed, skipped**. Completing writes an immutable completion event containing who and when; reopening/rotation doesn't delete history.
6. Manual chore rotation walks the **stable active roommate roster order**, wraps around, reopens the chore as Pending and asks/confirms a new due date.
7. Archive an active roommate only if >=2 active remain and the member has **no pending assigned chores or unsettled expense participation/contribution**. Historical records keep member identity; archived members are excluded from new selections.
8. Every important change persists after refresh in the same browser. Refresh must not overwrite a visitor's modifications with seed data.
9. Handle invalid input and storage failure gracefully; never silently corrupt saved state.
10. Do not introduce dead buttons, placeholder interactions, fabricated dashboard statistics, or UI claims that contradict the local-only prototype.

## Implementation approach

- Favor a clear structure (pages/features/components/domain utilities/state) over unnecessary layers, abstractions or frameworks.
- Use typed, serializable state with `schemaVersion: 1`. Validate data on load and recover with a user-visible choice if the stored payload is invalid.
- Put financial splitting, netting and chore rotation in **pure functions**; keep UI components thin.
- Keep a single source of truth for the household state. Derived totals, balances and dashboard counts must be calculated from state, not persisted redundantly.
- Use semantic HTML, accessible labeled forms and keyboard-operable dialogs. Maintain desktop and mobile usability.
- Prefer reuse of a small set of components: app shell, member avatar/picker, modal, forms, status pill, table/cards, empty state.
- Seed realistic *valid* demo data only when selected or reset. Use relative dates to keep overdue examples meaningful.
- Avatar upload is optional and lower priority; initials/icons must always work without uploads or remote image URLs.
- Avoid dependencies that are not justified for a four-day prototype.

## Workflow when implementing a task

1. Identify the requested feature and consult the relevant PRD/DESIGN sections. **If the user says plan only, do not modify files.**
2. Briefly state the intended files/behavior when the change is substantial; implement a narrow, testable slice.
3. Test the change: run available project scripts (`npm run build`, tests, lint/typecheck if configured). Don't claim commands ran unless they actually ran.
4. For expense math, test cent rounding, multiple payers, custom percentage/fixed splits, zero-sum nets, settlement/reopen and invalid totals.
5. For chores, test completion history, rotation wraparound, archived members and overdue date comparisons.
6. Manually outline UI checks the user should perform (especially refresh, empty state, Kanban, and mobile).
7. Report succinctly: what changed, test results, known limitations, and the next suitable slice. If blocked, explain precisely.
8. Preserve working functionality. Make small focused edits; do not casually rewrite unrelated modules.

## Suggested delivery order

1. Project scaffold, visual shell, welcome sample/empty setup, household roster, local persistence.
2. Chores CRUD, status/history, rotation, list/Kanban, overdue.
3. Expenses CRUD, all contribution/split modes, cents math, simplified balances and settlement.
4. Dashboard integration, agreements, settings, confirmations and reset.
5. Responsive/accessibility polish, build/test verification, deploy.

The PRD's must-have correctness and course deliverables outrank optional styling extras. Prioritize a usable, complete app by Thursday, leaving Friday as a buffer.

## Git and submission hygiene

- Keep changes reviewable. Prefer commits at working milestones; **do not run destructive Git commands or overwrite user changes** without permission.
- Never commit secrets, credentials or irrelevant personal data. No secrets are required by this project.
- The course requests **the complete dated conversation with the AI builder** as a prompt log. Do **not** fabricate, summarize in place of, or retroactively invent prompts or dates. The user should export/save the **real Codex session transcript** from their Codex environment and review it before submission. `docs/PRD.md` and `docs/DESIGN.md` may accompany the log as appendices.
- A passing build isn't proof of perfect UX: make it easy to verify functionality manually in a browser.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
