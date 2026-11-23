# RoomieOS implementation plan

**Last updated:** 23 November 2026

**Status:** Milestone 1 implemented and verified locally; no deployment performed.

**Current milestone:** Milestone 1 — foundation complete.

**Next milestone:** Milestone 2 — setup and validated local persistence.

**Delivery target:** Thursday, 26 November 2026; Friday, 27 November is the submission/fix buffer.

## 1. Purpose, authority and decisions

Build a polished Next.js client-side prototype for ENTI 407. `docs/PRD.md` is authoritative for behavior; `docs/DESIGN.md` is authoritative for UI/UX. This document records approved architecture, sequencing and actual progress. It does not override those requirements.

At plan approval, the repository contained documentation and a README, with no application scaffold. The foundation is now implemented; see the progress record below. Update this record after each working slice: check only completed work, record actual verification, and keep the current/next milestone accurate. Surface conflicts or new scope for user review rather than inventing requirements.

### Resolved requirements and defaults

- **Backend conflict resolved:** The user selected the approved local-only scope. Use Next.js App Router without backend API routes, Server Actions, authentication or a database. Household operations run in the browser.
- **History ordering:** Preserve completion events in append order; display newest first, as DESIGN specifies.
- **Archived-member edge cases:** Historical records remain viewable and editable without losing member references. Before reopening an expense involving archived members, require their restoration. Before reopening a chore assigned to an archived member, require reassignment to an active member. Rotation can directly select the next active member.
- **Design contrast:** Preserve the visual palette, but use sufficiently dark text variants where muted tokens fail contrast requirements.
- **Priority:** All PRD must-haves remain MVP requirements. Defer photo uploads, drag-and-drop and decorative animation.

## 2. Architecture and state

Use Next.js App Router, TypeScript, Tailwind CSS and `lucide-react`, with static deployment on Vercel.

### Application structure

- **Routes (`src/app`):** `/` for Dashboard, plus `/welcome`, `/chores`, `/expenses`, `/agreements` and `/settings`. A client initialization gate shows loading until storage is read, then presents setup, recovery or the requested screen.
- **Shared UI (`src/components`, `src/styles`):** App shell, page header, avatar/picker, fields, status pills, accessible dialogs, confirmations, notices and empty states. Desktop sidebar; mobile navigation drawer. Tables become cards on phones; Kanban scrolls within its own region.
- **Feature modules (`src/features`):** Setup, household, chores, expenses, agreements and dashboard. Keep form drafts local to their feature.
- **Domain utilities (`src/domain`):** Types, runtime validation, money parsing/allocation, balances, rotation, date helpers and sample generation. These functions must not depend on React or browser storage.
- **State layer (`src/state`):** One client provider with typed domain actions and shared selectors. Route changes must preserve the provider. Keep browser storage access behind a small adapter.

Follow the PRD's `AppState` model with `schemaVersion: 1`. Use stable IDs and member ordering; retain archived members. Persist facts, selected profile and settings. Calculate balances, transfer suggestions, overdue indicators and dashboard counts from those facts.

### Important interfaces

- Domain actions cover CRUD, status changes, rotation, archive/restore, profile selection and resets.
- Commands return success or actionable validation/storage errors.
- Storage exposes load, save and clear operations with explicit failure results.
- Inject time and ID generation into domain operations where needed for deterministic tests.

### Financial rules

- Parse currency input as decimal strings into integer cents; percentages into integer basis points.
- Require safe integer amounts and reject inputs whose calculations exceed supported integer bounds.
- Allocate equal-split remainder cents by stable roster order. Use largest remainder for percentages, with the same stable tie-breaker.
- Validate payer and participant totals independently. Reject duplicate entries for the same member within each role.
- Generate advisory transfers from open-expense nets, matching largest balances first with stable member-ID ties.
- Settlement is a confirmed whole-expense marker for resolution outside the app, never an integrated payment action.

## 3. Persistence and recovery

Use only `localStorage["roomieos:v1"]`.

- Read storage once after client mount. Do not render household-dependent content or save defaults before initialization completes.
- Distinguish absent data, valid data, malformed/unsupported data and unavailable storage.
- Validate structure, references, roster constraints, dates and financial invariants on load and before persistence.
- Generate sample data only after explicit selection or confirmed reset. Base dates on the local date at that moment.
- For each change, calculate and validate the next state, persist it, then publish it to React. Show success only after saving succeeds.
- If saving fails, preserve the prior household and the user's form input. Show a useful error and allow retry.
- Invalid data remains untouched until the user confirms reset. Unsupported versions must not silently become sample data.
- Reset demo replaces saved state only after confirmation. Start over clears it only after confirmation and successful storage removal.
- On another tab's storage change, stop stale writes and offer reload before further editing.
- Store calendar dates as `YYYY-MM-DD`; use timestamps for completion events. Recompute date-sensitive displays on focus and relevant interactions.

## 4. Milestones and implementation order

Each milestone ends with relevant checks, a reviewable commit and a progress update here. Introduce polish with each feature rather than postponing the entire visual design until release. During intermediate milestones, hide unavailable actions instead of exposing dead buttons.

| Done | Milestone | Deliverable and acceptance gate | Target |
|---|---|---|---|
| [x] | 0. Planning record | Save approved plan; add document precedence and progress rules to AGENTS | Monday |
| [x] | 1. Foundation | Scaffold, design tokens, responsive shell, shared controls/dialogs, test scripts; build passes | Completed Monday |
| [ ] | 2. Setup and persistence | Sample/empty setup, roster, profile switching, household settings, storage validation/recovery, reset/start over; refresh preserves edits | Tuesday |
| [ ] | 3. Chores | CRUD, status/history, rotation/date confirmation, filters, List/Kanban, overdue; both views use identical state | Tuesday |
| [ ] | 4. Expenses | Money utilities/tests first; then CRUD, multiple payers, three split modes, breakdowns, balances and settle/reopen | Wednesday |
| [ ] | 5. Integration | Agreements CRUD, derived dashboard, complete sample data, consistent empty/error states and feedback | Wednesday |
| [ ] | 6. Release | Accessibility/mobile checks, production build, Vercel verification, video and real prompt transcript | Thursday |

### Milestone 1 TODOs

- [x] Scaffold Next.js App Router with strict TypeScript, Tailwind and Lucide; include a dependency lockfile in the milestone snapshot.
- [x] Configure lint, typecheck, test and production-build scripts.
- [x] Implement shared design tokens, typography, focus states, spacing and local wordmark.
- [x] Build desktop sidebar, top bar and accessible mobile navigation drawer.
- [x] Add page headers, buttons, labeled fields, avatars, status pills, notices and empty states.
- [x] Add accessible modal/confirmation primitives with keyboard and focus handling.
- [x] Establish route/feature/domain/state boundaries without introducing fabricated household data or inactive feature controls.
- [x] Verify shell layouts at 375, 768 and 1280 px, keyboard navigation and dialog behavior.
- [x] Run available lint, typecheck, tests and production build; record actual results below.

## 5. Dependencies, tests and risks

### Dependencies

Next.js, React, React DOM, TypeScript, Tailwind CSS and Lucide. Add Zod for runtime validation and Vitest for domain/storage tests. Use native forms and native dialogs with tested focus handling. Avoid state libraries, chart packages, remote fonts and UI frameworks. Select compatible stable package versions during scaffolding and commit the lockfile.

Foundation tooling also includes Playwright for real-browser layout/navigation/dialog checks and Prettier for source formatting. Zod remains deferred until Milestone 2 needs runtime validation. TypeScript is pinned to 6.0.3 because the installed Next.js lint tooling rejects TypeScript 7; ESLint 9 matches the upstream React plugin's supported peer range. Exact dependency versions are recorded in `package-lock.json`.

### Required verification

- **Money:** 100 cents across three participants yields 34/33/33; multiple payers; percentage rounding/ties; fixed totals; invalid inputs; zero-sum nets; deterministic transfers; settlement/reopening.
- **Chores:** Completion identity/time; repeated completion without duplicate events for unchanged status; preserved history; rotation wraparound and archived members; yesterday/today comparisons.
- **State/storage:** Sample and empty initialization; malformed/unsupported payloads; failed reads/writes/clears; roster limits; archive guards; currency blocked by any expenses.
- **Browser:** Refresh every major flow, switch perspective, cancel dialogs, keyboard navigation/focus restoration, error feedback and every visible action.
- **Layout:** 375, 768 and 1280 px; contained board scrolling; usable expense forms and dialogs.
- **Release:** Lint, typecheck, tests and production build; deployed deep links and private-window first-run behavior.

### Main risks and mitigations

| Risk | Mitigation |
|---|---|
| Expense-form complexity and rounding | Implement pure tested arithmetic first; preview exact contributions/shares before save |
| Storage hydration and data loss | Client initialization gate, runtime validation, explicit recovery and save-before-publish |
| Archived historical references | Retain member records and stable order; guard reopening and new assignments |
| Dialog accessibility and mobile density | Reuse shared primitives; check keyboard, focus and small viewports early |
| Short deadline | Small milestones; prioritize correct required behavior; defer optional visuals/uploads |

## 6. Progress and release checklist

### Progress record — 23 November 2026

- Approved plan saved to `PLAN.md`; recurring plan instructions added to `AGENTS.md`.
- No application code written and no dependencies installed in this documentation slice.
- Repository inspection confirmed no application scaffold or project scripts yet.
- Application build, lint, typecheck and tests have not run; they are not available yet.
- No implementation blocker identified. Next slice: Milestone 1 foundation.

### Foundation implementation — 23 November 2026

- Implemented static Next.js App Router routes for Dashboard, Chores, Expenses, Agreements, Settings and Welcome, plus a custom not-found screen.
- Added the desktop sidebar/top bar, mobile native-dialog navigation, current-page labels, skip link, local wordmark and informative About dialog.
- Added shared buttons (including correctly sized icon buttons), page headers, input fields, initials/icon avatars, status pills, notices, empty states, modal and confirmation primitives.
- Applied design tokens and darker muted text for contrast. System fonts and local SVGs avoid remote assets.
- Added the PRD's serializable domain types and documented the state-provider boundary. No household provider, initialization, storage writes or fabricated statistics are present yet.
- Foundation routes explicitly describe their current implementation stage. Welcome describes sample and empty setup without pretending those flows work already.
- Verification: `npm run lint` passes with zero warnings; `npm run typecheck` passes; `npm run build` passes and exports static pages to `out/`.
- Verification: `npm test` runs Vitest successfully with no unit tests yet; this is tooling readiness, not domain-test coverage.
- Verification: `CHROMIUM_PATH=/usr/lib64/chromium-browser/chromium-browser npm run test:browser` passes 11 tests with 1 intentional desktop drawer skip. Checks cover routes/reloads, viewport overflow at 375/768/1280 px, dialog keyboard/focus behavior, and preservation of existing browser storage.
- Reviewed dashboard screenshots at phone and desktop widths. Browser tests also capture Welcome screenshots at all three widths under ignored `test-results/`.
- Initial failures resolved: TypeScript 7 lint incompatibility, mobile icon padding conflict, navigation test visibility timing, and lint formatting/entity issues. Build/browser checks require execution outside this environment's sandbox because local process ports are restricted.
- Limits: browser verification used installed Chromium, not Safari/Firefox; shared form/confirmation primitives need feature-level coverage when integrated. Household setup, profile selection, storage validation/recovery and CRUD remain unimplemented as planned.
- Git checkpoint: foundation and hydration feedback. No deployment performed. Next slice: Milestone 2.

### Foundation feedback — hydration warning

- The user reported a development hydration overlay showing injected `bis_skin_checked`, `bis_register` and `__processed_*` attributes; those attributes are absent from application source. Extension interference is the leading diagnosis, pending confirmation in the user's browser with extensions disabled.
- Added console-error monitoring to the existing route regression test: React hydration diagnostics are not necessarily thrown `pageerror` events. Exercise a client dialog after the final reload before asserting diagnostics are empty.
- Initial testing reused the user's preview and encountered HMR connection failures. Browser tests now own port 3100 (overridable with `ROOMIEOS_TEST_PORT`) and `.next-e2e/`, so they do not reuse the user's server or share its dev-build lock. No preview process was stopped.
- Verification: the strengthened route/reload/console test passes at 375, 768 and 1280 px (3 tests), including the final dialog interaction, with no console errors in the isolated extension-free browser contexts.
- Verification: lint, typecheck and the production static build also pass after the test-isolation changes.
- Documented extension-disabled verification in README. Kept hydration diagnostics enabled; no warning suppression or extension-attribute cleanup was added to the app.

### Manual review before Milestone 2

- Run `npm run dev`; inspect Dashboard and all navigation destinations at phone and desktop widths.
- Open/close the mobile menu and About dialog with the keyboard; confirm visible focus and return to the trigger.
- Refresh a feature route and inspect Welcome; verify the copy clearly describes this foundation preview.
- In later milestones, extend this review to sample/empty initialization, persisted refreshes, Kanban and expense forms as those behaviors become available.

### Release deliverables

- [ ] All PRD acceptance criteria checked, including sample and empty modes.
- [ ] Public Vercel URL verified, including fresh private-window access and route refreshes.
- [ ] User-perspective demonstration video of at most five minutes prepared.
- [ ] Authentic complete dated Codex transcript exported and reviewed by the user; no invented or replacement prompt history.
- [ ] Required submission materials prepared, with PRD/design appendices if useful.
