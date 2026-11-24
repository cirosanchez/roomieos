# RoomieOS implementation plan

**Last updated:** 24 November 2026

**Status:** Sidebar polish implemented and verified following component review. No deployment performed.

**Current milestone:** Component review — sidebar polish complete.

**Next milestone:** Milestone 6 — release verification and submission deliverables.

**Delivery target:** Thursday, 26 November 2026; Friday, 27 November is the submission/fix buffer.

## 1. Purpose, authority and decisions

Build a polished Next.js client-side prototype for ENTI 407. `docs/PRD.md` is authoritative for behavior; `docs/DESIGN.md` is authoritative for UI/UX. This document records approved architecture, sequencing and actual progress. It does not override those requirements.

At plan approval, the repository contained documentation and a README, with no application scaffold. The foundation, household setup/persistence, chores, expenses, agreements and integrated dashboard are now implemented; see the progress record below for verification. Update this record after each working slice: check only completed work, record actual verification, and keep the current/next milestone accurate. Surface conflicts or new scope for user review rather than inventing requirements.

### Resolved requirements and defaults

- **Approved Milestone 2 expansion:** The user raised the active-roommate limit from 5 to 20 and requested more avatar choices. The current limit is **2–20 active roommates**, with 40 named/grouped emoji presets plus initials. PRD and DESIGN version 1.1 now reflect this explicit user-approved change from the original 2–5 limit. Existing saved avatar values and `schemaVersion: 1` remain compatible.
- **Backend conflict resolved:** The user selected the approved local-only scope. Use Next.js App Router without backend API routes, Server Actions, authentication or a database. Household operations run in the browser.
- **History ordering:** Preserve completion events in append order; display newest first, as DESIGN specifies.
- **Archived-member edge cases:** Historical records remain viewable and editable without losing member references. Before reopening an expense involving archived members, require their restoration. Before reopening a chore assigned to an archived member, require reassignment to an active member. Rotation can directly select the next active member.
- **Design contrast:** Preserve the visual palette, but use sufficiently dark text variants where muted tokens fail contrast requirements.
- **Priority:** All PRD must-haves remain MVP requirements. Defer photo uploads and decorative animation. The user explicitly approved dependency-free chore-card dragging during UI review on 24 November 2026.

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
| [x] | 2. Setup and persistence | Sample/empty setup, roster, profile switching, household settings, storage validation/recovery, reset/start over; refresh preserves edits | Completed Monday |
| [x] | 3. Chores | CRUD, status/history, rotation/date confirmation, filters, List/Kanban, overdue; both views use identical state | Completed Monday |
| [x] | 4. Expenses | Money utilities/tests first; then CRUD, multiple payers, three split modes, breakdowns, balances and settle/reopen | Completed Tuesday |
| [x] | 5. Integration | Agreements CRUD, derived dashboard, complete sample data, consistent empty/error states and feedback | Completed Tuesday |
| [x] | 5a. UI refresh | Shadcn/Base UI navigation and shared controls throughout; regression and visual review | Before release |
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

### Milestone 2 TODOs

- [x] Validate the full versioned payload, financial sums/splits, dates, identities, member references and active-roster invariants.
- [x] Add one root household provider, stable hydration/loading gates and save-before-publish storage transactions.
- [x] Implement explicit sample/empty setup with chosen currency and 2–20 active roommates; generate valid relative-date sample data only on selection/reset.
- [x] Implement household edits, initials/icon avatars, roommate add/edit/archive/restore, active-only profile switching and selected-profile fallback.
- [x] Enforce archive obligations and currency locking while any expenses exist; explain blocked operations.
- [x] Add confirmed reset/start-over, invalid/unsupported-data recovery, storage-error retries and cross-tab stale-write protection.
- [x] Connect saved facts to the shell, personal chore summaries and read-only feature records without exposing unavailable CRUD controls.
- [x] Verify domain/storage tests, browser flows at 375/768/1280 px, console diagnostics, lint, typecheck, formatting and the static build.

### Milestone 3 TODOs

- [x] Add pure chore create/edit/delete/status actions with required-field, active-assignment and date validation.
- [x] Record completion identity/time once per transition to Completed; retain immutable history through reopen/edit/rotation and display newest first.
- [x] Rotate through stable active roster order, including archived assignees and wraparound; preview the next roommate and confirm a new due date.
- [x] Build labeled create/edit forms, details/history, status controls, confirmed deletion, filters and shared-state List/Board views.
- [x] Preserve archived historical assignments during edits; require active reassignment or rotation before reopening.
- [x] Verify local-calendar overdue/focus updates, contained keyboard-accessible Board scrolling, persistence, storage errors, cross-tab draft conflicts, long content and dialog focus at 375/768/1280 px.
- [x] Run domain/storage and browser regressions, lint, typecheck, formatting and the production static build; record actual results below.

### Milestone 4 TODOs

- [x] Implement and test integer-cent parsing/formatting, deterministic equal and largest-remainder percentage allocations, zero-sum open-expense nets and greedy advisory transfers.
- [x] Validate payer contributions and participant shares independently; reject duplicate roles, invalid amounts/dates/percentages and unsafe aggregate calculations without saving.
- [x] Add expense create/edit forms with multiple payers, active participant selection, all three split modes, exact share previews and actionable currency discrepancies.
- [x] Add responsive expense records/details, full contribution/share breakdowns, personal balance and household transfer suggestions.
- [x] Add confirmed whole-expense settlement, reopening, confirmed deletion, historical archived-role edits and restoration guards.
- [x] Derive the dashboard personal balance from the same ledger; preserve browser persistence, conflict protection and failed-save drafts.
- [x] Complete final full regression and record results/checkpoint after the test-clock correction.

### Milestone 5 TODOs

- [x] Add agreement create/edit/delete actions and shared title/details validation through the existing persistence transaction.
- [x] Replace the read-only agreement preview with a document-like list, keyboard-operable action menus, forms, confirmed deletion and helpful empty state.
- [x] Finish the dashboard with personal summary cards, sorted/date/status-labeled upcoming chores, a household snapshot, agreement link and one contextual chore-creation action.
- [x] Reuse chore dialogs on the dashboard and derive all counts/balances from saved state; preserve complete valid sample data without replacing visitor changes.
- [x] Verify agreement actions/storage and personal/household summary calculations with unit tests.
- [x] Finish browser integration/mobile/keyboard/failure checks, final build and progress/checkpoint.

## 5. Dependencies, tests and risks

### Dependencies

Next.js, React, React DOM, TypeScript, Tailwind CSS and Lucide. Add Zod for runtime validation and Vitest for domain/storage tests. Use native forms and native dialogs with tested focus handling. Avoid state libraries, chart packages, remote fonts and UI frameworks. Select compatible stable package versions during scaffolding and commit the lockfile.

Foundation tooling also includes Playwright for real-browser layout/navigation/dialog checks and Prettier for source formatting. Milestone 2 adds Zod 4.6.7 as a direct runtime dependency. TypeScript is pinned to 6.0.3 because the installed Next.js lint tooling rejects TypeScript 7; ESLint 9 matches the upstream React plugin's supported peer range. Exact dependency versions are recorded in `package-lock.json`.

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

### Household setup and persistence — 23 November 2026

- Added `HouseholdProvider` above Welcome and household routes, with stable loading HTML for hydration, setup/loaded-household redirects and recoverable invalid/unavailable-storage screens.
- Added an injectable external store with validated synchronous commands. Initialization never seeds or writes. Mutations validate, compare saved data with the last observed payload, persist, then publish. Failed writes/clears retain prior facts and form drafts; success feedback appears only after saving.
- Implemented explicit sample and empty setup, currency choice, inline errors with focus handling, and a 2–5 roommate form with initials or preset icon avatars. Sample data includes five chores, completion history, four valid expenses across all split methods, and three agreements. Completion timestamps follow chore creation; dates are relative to setup/reset time.
- Implemented settings for household name/currency, roommate add/edit/archive/restore, stable roster order, active limits and obligation guards. The profile switcher lists active roommates and persists the local perspective. Archiving the selected member falls back to the first active member; historical references are retained.
- Invalid JSON, unsupported versions, missing references and financial inconsistencies reach explicit recovery without overwriting data. Currency remains locked by settled as well as open expenses. Reset/start-over and archive require confirmation; failed destructive operations leave data intact.
- Storage events/window focus detect changes from another tab. Writes check again immediately before persistence and refuse stale data. Reload is explicit; this is local conflict handling, not roommate/device synchronization.
- Replaced foundation-only notices with saved read-only chores, expense breakdowns and agreements. Dashboard counts/upcoming chores derive from state and react to profile changes. Financial balance cards and full dashboard composition remain for the expense/integration milestones; the current third card reports active roommates.
- Verification: `npm test` passes 38 domain/storage tests. The test command now requires a real suite rather than allowing an empty one.
- Verification: the full Chromium browser suite passes 38 tests with 1 intentional desktop drawer skip, across 375/768/1280 px. Coverage includes both setup paths, refresh/no reseeding, profile changes, roster operations/limits, invalid/unsupported data, blocked storage, failed-save retries, destructive confirmations and actual same-browser cross-tab changes/removal.
- Verification: subsequent focused first-run/sample checks pass at all three widths after the sample chronology correction. Focused empty-setup checks also pass after adding maximum-length household-name wrapping and overflow assertions.
- Verification: final lint, typecheck, Prettier checks and production static build pass. Browser route regression tests continue to monitor console errors as well as uncaught exceptions. No hydration errors were reported in their isolated contexts.
- Reviewed desktop/phone dashboard and Welcome/setup screenshots. Fixed stale field validation feedback and ensured long household names wrap without page overflow. Artifacts remain in ignored test output directories.
- Limits: Chromium verification only; photo uploads are deferred. Chore CRUD/history details/rotation/Kanban, expense CRUD/balances/settlement and agreement CRUD remain for their respective milestones. No backend, external integrations or deployment were added.
- Milestone 2 and its approved expansion form the end-of-day Git checkpoint. Next slice: Milestone 3.

### Manual review before Milestone 3

- Open the app in a fresh browser context; try sample setup, switch perspective, rename the household/member and refresh a feature route. Confirm all changes persist without replacing the sample records.
- Start over with confirmation, choose empty setup and enter two roommates/currency. Add a third, switch to it, archive it, and restore it; verify profile fallback and stable roster order. With two active members, archiving should be blocked.
- In sample mode, verify currency locking and archive-obligation explanations. Cancel reset/start-over before trying their confirmed flows; check browser-only disclosure and mobile/dialog keyboard behavior.
- Open Settings in two tabs, change one tab, and verify the other requires reload instead of saving over it. Browser tests cover malformed-data and storage-failure recovery without requiring manual edits to real saved data.

### Milestone 2 expansion — more avatars and larger households

- Raised the active-roster cap to 20 while retaining the two-roommate minimum and existing archive-obligation guards. Central constants drive setup, state validation, add/restore guards and UI counts/limits. Archived historical members do not count toward the active limit.
- Expanded the local avatar catalog to 40 named choices in Nature, Animals, Food & drink, Hobbies, and Home & favorites groups. Both setup and settings use the same grouped native selector; initials and all six original emoji values remain supported. No new dependency, storage format or migration is required.
- Added tests for valid 20-member payloads, rejected 21-member payloads, old/new avatar persistence, and full 20-roommate browser flows including profile switching and archive/restore at capacity.
- Verification: 40 unit tests and 41 browser tests pass, with 1 intentional desktop drawer skip. The browser suite includes a complete 20-member setup/add/edit/archive/restore/profile/refresh flow at 375, 768 and 1280 px. Final lint, typecheck, formatting and production static build pass. The initial automatic approval review timed out before starting browser tests; the authorized retry succeeded.
- Dashboard distribution remains an interim layout. The personal balance card and fuller personal/household arrangement still belong to the expense/integration milestones; no layout redesign was added in this slice.

### End-of-day handoff — 23 November 2026

- The user completed the feedback loop and requested a commit/push and stopping for today. No additional milestone is started as part of this checkpoint.
- Completed through Milestone 2: first-run setup, local persistence/recovery, household/roster settings, demo profile switching, reset/start-over, cross-tab conflict protection, 2–20 active roommates and 40 named icon presets.
- Latest verification: 40 unit tests and 41 browser tests passed, with 1 intentional desktop drawer skip; lint, typecheck, formatting and the production static build passed. Closing changes only reconcile documentation and Git state; these results are from the preceding implementation checks.
- PRD/DESIGN version 1.1, AGENTS and README now agree on the expanded roster and avatar choices. `schemaVersion: 1` and `roomieos:v1` remain unchanged.
- Resume with Milestone 3 when requested: pure chore actions first, then CRUD forms/details, immutable completion history, manual active-roster rotation with date confirmation, filters, List/Kanban and local-calendar overdue checks. Reuse the existing validated transaction store and test archive/restore behavior with up to 20 active members.
- Expenses and agreements remain read-only; their editing/balances/settlement and the final dashboard distribution stay in later milestones. Photo uploads and deployment remain deferred.
- Keep the real session transcript for the course prompt log; this handoff is a progress record, not a substitute for the authentic conversation export.

### Chore implementation — 23 November 2026

- Added pure chore CRUD/status/rotation actions through the existing validated save-before-publish store. Completion records use the selected demo profile and injected time/ID; unchanged Completed status adds no event. Reopening, editing and rotation preserve history; deletion removes the chore and its history.
- Added create/edit forms, details with newest-first history, confirmed deletion, rotation with next-active-roommate/date preview, List/Board, assignee/status filters and local-calendar overdue indicators. Archived historical assignments remain editable; reopening requires active reassignment or rotation. New assignments exclude archived members.
- Added actionable inline storage/conflict feedback without discarding drafts. Save failures retain prior facts/events and permit retry; same-browser cross-tab changes disable open form saves until explicit reload. Nested dialogs restore focus on cancel/Escape; deletion returns focus to New chore.
- Verification: `npm test` passes 65 unit/storage tests (25 new). `npm run lint`, `npm run typecheck`, `npx prettier --check src tests` and `git diff --check` pass. `npm run build` passes and exports static routes to `out/`.
- Verification: the full Chromium suite passes 62 tests with 1 intentional desktop navigation-drawer skip at 375/768/1280 px. Twenty-one new browser checks cover empty CRUD, form validation, current-profile history/newest-first order, reopen/recomplete, rotation/date validation/cancel, edit/delete confirmation, refresh, both views/filters, archived historical edits with 20 active roommates, failed-save retries, same-browser cross-tab draft protection, long content and local-midnight focus updates. The route regression continues to monitor console and uncaught errors; no hydration diagnostics were reported.
- Initial simulated-midnight failures came from a runner/browser timezone mismatch in the fixture; the corrected test constructs the clock in the browser's local zone and now passes at all widths. Sandbox port restrictions initially blocked browser/build startup. Outside-sandbox execution succeeded; the build also required moving the generated Turbopack cache aside after it retained the restricted attempt's failure. No app configuration workaround or dependency was added.
- Browser screenshots reviewed for desktop List, mobile Board and mobile history. Board scrolling is contained and keyboard accessible. README and prototype disclosure now describe available chore functionality. Existing `docs/logs/` content remains outside this slice.
- Limits: Chromium verification only; view/filter choices are temporary UI state, while chore facts and history persist. Expenses/agreements remain read-only, and final dashboard composition stays in later milestones. No deployment performed.
- Next slice: Milestone 4, beginning with integer-cent financial utilities and tests before expense forms, balances and settlement.

### Chore view feedback — 23 November 2026

- The user requested Kanban for the chore view. Chores now opens in Board by default, including after refresh, with Pending/Completed/Skipped columns; List remains available through the existing switcher.
- Updated existing browser checks to assert the initial/refreshed Board and explicitly exercise List before switching back. All 21 chore browser checks pass at 375/768/1280 px; 65 unit/storage tests, lint, typecheck and the production build pass. No new test suite or dependency added.
- Manual check: open Chores, switch to List and back, change a card's status, then refresh. On a phone, scroll within the board to reach all three columns.

### Manual review after Milestone 3

- From an empty household, add a chore with notes and a due date; cancel an edit, save another, then refresh. Confirm all saved fields remain.
- Switch demo perspective, complete a chore, reopen/recomplete it and inspect the newest-first history. Rotate it, checking the proposed roommate/date before confirming; refresh and verify previous completions remain.
- Try status/roommate filters and both List/Board. On a phone, scroll across all three Board columns, change a status and open details. Compare an overdue pending chore with one due today.
- Cancel deletion before confirming another deletion. Use Tab/Escape through forms/rotation/confirmations and check focus returns to the triggering control (or New chore after deletion). Browser-only storage and the demo-perspective disclosure should remain clear.

### Expense implementation — 23–24 November 2026

- Added pure integer-cent parsing/formatting, equal and largest-remainder percentage allocation, open-expense netting and deterministic largest-balance advisory transfers. BigInt intermediates protect cent arithmetic; persisted money remains safe integer numbers. Exact display formatting retains the final cent even at the safe integer maximum. Runtime validation and form previews share the same split functions; unsafe aggregate balances are rejected before publication/persistence.
- Added expense CRUD, category/date/notes fields, multiple payer rows, participant chips and equal/percentage/fixed modes with exact per-person previews. Payer and share totals validate independently, including currency discrepancies and duplicate-role guards. Single-payer totals follow amount edits only while the contribution still matches the prior total; custom/multi-payer contributions must be rebalanced explicitly.
- Added desktop tables and tablet/phone cards, contribution/share details, personal net position and Who owes whom. Whole-expense settlement requires explicit confirmation of resolution outside RoomieOS; reopening restores the record's balance effect. No pairwise/partial settlement or payment integration is implied. Delete requires confirmation.
- Historical archived roles remain visible/editable while settled. New selections require active roommates; reopening an expense involving archived roommates requires their restoration. Currency remains locked by settled records. Failed saves retain facts, balances and form drafts; real same-browser cross-tab changes disable stale form saves until explicit reload.
- Bound the dashboard's My balance card to the same derived ledger, alongside My pending chores and Open household expenses. Broader dashboard composition and agreement editing remain in Milestone 5. Updated README/prototype disclosures and reused existing dialogs/controls, adding a wider expense form and long-label wrapping without a new dependency or storage migration.
- Verification: `npm test` passes 106 unit/storage tests (41 new). Coverage includes integer parsing/formatting, cent ties/remainders, sizes 2–20, multiple payers, percentage/fixed validation, zero shares, zero-sum nets, deterministic transfers, settlement/reopen, archived roles, aggregate bounds, persistence and failed/stale writes. Lint, typecheck, source/test/config formatting and diff checks pass. The production static build passes and exports routes to `out/`.
- Verification: full Chromium browser regression passes 83 tests with 1 intentional desktop navigation-drawer skip at 375/768/1280 px. Twenty-one new expense checks cover empty CRUD, exact previews, all splits/multiple payers, independent invalid totals, profile/dashboard balances, settlement cancel/confirm/reopen, persisted refreshes, currency locking, deletion/focus, archived edits/restoration, 20 participants/large safe amounts/long content, create/edit/settle/reopen/delete save retries and cross-tab draft protection. Expense and route checks report no console/uncaught/hydration errors. Reviewed desktop/phone forms, balances and large-household screenshots.
- Test issues resolved: currency text matchers now normalize Intl whitespace; diagnostics confirmed differing Node/Chromium Edmonton offsets (UTC−7 vs UTC−6). General fixtures and Chromium use UTC, while the existing local-midnight test explicitly exercises Edmonton. One interrupted full run left its isolated port-3100 server; inspected and stopped only that run's server before retrying. Product dates continue to use the visitor's browser-local calendar, and the visitor preview was not stopped.
- Limits: Chromium verification only; agreements remain read-only until Milestone 5. No deployment performed. Existing `docs/logs/` and development-generated `next-env.d.ts` changes remain outside the milestone commit.
- Next slice: Milestone 5 — agreements CRUD, final dashboard composition and integration feedback.

### Manual review after Milestone 4

- From an empty household, add a CAD 1.00 expense shared equally by three roommates. Check the 0.34/0.33/0.33 preview, save, switch perspective and refresh; confirm the balances and records persist.
- Try multiple payers, percentage shares totalling 100.00%, and fixed shares totalling the expense amount. Change the amount or participant selection and confirm mismatches prevent saving with a visible currency discrepancy.
- Open a breakdown, cancel settlement, then confirm full settlement outside RoomieOS. Check balances/dashboard, refresh and reopen to restore the original nets. Currency should stay locked while settled records exist. Cancel deletion before trying a confirmed deletion.
- On a phone, scroll through the expense form and use all payer/split controls. Try keyboard Tab/Escape through details, forms and confirmations. With two tabs open, change one and confirm an open draft in the other requires explicit reload before saving.

### Integration implementation — 24 November 2026

- Pushed the three completed chore/board/expense commits through `8304ab1` to origin/main as requested, then continued with Milestone 5. Existing logs and development-generated changes remain outside the checkpoint.
- Added pure agreement create/edit/delete actions and shared validation. Agreements now use a document-like list, labeled title/details forms, explicit action-button disclosures and confirmed deletion. Blank/long invalid input saves nothing; storage failures retain drafts and prior records. Agreement content is household-wide across demo perspectives, with the same stale-tab protections as other features.
- Completed the dashboard's three personal/household summary cards and two-column upcoming-chores/Household-at-a-glance layout. All counts/balances derive from saved records. Upcoming chores sort by due date, include Pending/Overdue labels and open the existing chore details/actions; a single Add a chore action reuses the existing form. Household counts, active roster size and an agreement link/count update immediately after changes and perspective switches. Empty households show zero facts and working calls to action.
- Replaced the remaining foundation views with dedicated agreement/dashboard modules and removed the obsolete preview notice/copy. The existing sample remains complete and valid: five chores across all statuses, immutable completion history, four expenses covering multiple payers/all three splits/settlement, and three agreements. No additional seed writes, persisted derived fields, dependencies or storage migration were introduced.
- Verification: `npm test` passes 122 unit/storage tests (16 new). Agreement validation/identity/order/persistence/failures and personal-versus-household dashboard calculations have coverage. Lint, typecheck, formatting and diff checks pass. The production static build passes and exports routes to `out/`.
- Verification: the full Chromium suite passes 104 browser checks with 1 intentional desktop navigation-drawer skip at 375/768/1280 px. Twenty-one new integration checks cover agreement CRUD/inline errors/optional details, keyboard action menus/dialogs/focus restoration, failed create/edit/delete retries, cross-tab drafts, shared perspectives, long content, dashboard profile/count/balance updates, chore completion/rotation from Dashboard, empty-state creation/navigation, refresh persistence and Edmonton local-midnight overdue changes. Console/uncaught/hydration monitoring reports no errors. Reviewed desktop dashboard and phone dashboard/agreement/form screenshots.
- Browser feedback resolved: Chromium exposed the first native-details action trigger as generic, so it now uses an explicit button disclosure with expanded state, outside-click/blur/Escape dismissal and focus restoration. Setup-retry tests now navigate through the actual sidebar/mobile menu after removal of the old foundation Settings notice. The final full regression passes after both corrections.
- Limits: Chromium verification only; no Vercel deployment or course video/transcript export performed. Manual release review and submission deliverables remain in Milestone 6. Existing `docs/logs/` and generated `next-env.d.ts` changes remain outside the milestone commit.
- Next slice: Milestone 6 — final accessibility/mobile review, deployed deep-link/private-window verification and authentic submission materials.

### Manual review after Milestone 5

- Add an agreement from the empty state; try a blank title, multiline details, edit/cancel and delete/cancel/confirm. Refresh the route and verify saved text remains. Use keyboard Tab/Enter/Escape through its action menu and dialogs.
- On Dashboard, switch perspectives and compare personal chores/balances with household counts. Open an upcoming chore, complete/reopen or rotate it, then refresh and check both Dashboard and Board agree. Add a new chore directly from Dashboard.
- From an empty household, verify zero counts and helpful actions; follow the agreements link, create an agreement and check its dashboard link/count updates. Review 375/768/1280 px layouts and the mobile menu.
- Use Settings for household renaming, reset/start-over confirmations and roster management; the remaining release pass should check every visible control plus the deployed deep links and authentic course deliverables.

### Release deliverables

- [ ] All PRD acceptance criteria checked, including sample and empty modes.
- [ ] Public Vercel URL verified, including fresh private-window access and route refreshes.
- [ ] User-perspective demonstration video of at most five minutes prepared.
- [ ] Authentic complete dated Codex transcript exported and reviewed by the user; no invented or replacement prompt history.
- [ ] Required submission materials prepared, with PRD/design appendices if useful.

### Approved shared UI refresh — 24 November 2026

- User approved shadcn/ui with Base UI for sidebar, buttons, custom selects, menus, dialogs and standard form choices across all screens. Preserve the warm neutral/blue design, existing page composition and household behavior. Desktop sidebar starts expanded, collapses to a temporary icon rail and uses a Sheet below 1024 px. No sidebar cookie or new storage key.
- Custom calendars, broad card/table/badge redesigns and deployment are deferred. Date fields retain native calendar behavior with refreshed styling. The next step is the user's component-specific visual review.
- Local shadcn base-nova sources are adapted for Lucide, RoomieOS tokens, touch targets, controlled overlays and the existing static architecture. Explicit typed SelectField options/value callbacks replace native select events. Household domain/store/schema remain unchanged.
- Verification: 122 unit/storage tests pass. All 104 existing Chromium checks pass at 375/768/1280 px, with one intentional desktop drawer skip; the three added sidebar/keyboard checks pass in a focused run after correcting their reload fixture and adding explicit tooltip semantics. Lint, typecheck, source/test formatting and diff checks pass; the final production static build exports all routes successfully.
- Reviewed desktop dashboard/collapsed-sidebar and mobile dashboard screenshots. Review artifacts are saved under `/tmp/roomieos-ui-review/`; browser-run screenshots remain in ignored `test-results/`. The new checks exercise collapsed tooltips, no cookies/new household writes on collapse, temporary expansion, mobile Sheet focus, keyboard profile selection and refresh persistence.
- Migration fixes include the server-safe button-style export, nested overlay/focus restoration, long-text dialog wrapping, avatar label spacing and tooltip role. Existing browser tests now use custom options and menu semantics while retaining domain/persistence assertions.
- Limits: Chromium verification only; native date calendars remain. No deployment or course deliverables performed. Ready for the user's component-by-component review before Milestone 6.

### Draggable chore cards — 24 November 2026

- User requested GitHub-style card dragging for the Kanban board. Implemented a compact card presentation and moves between Pending/Completed/Skipped with pointer/touch/keyboard support; retain status selectors as an alternative. Within-column ordering remains the existing saved chore order; no ordering field or schema change.
- Reused the existing save-before-publish set-chore-status action for every drop. Same-column/outside/cancelled drops save nothing; completed drops retain immutable history and archived-assignment/storage/conflict guards. No drag-and-drop dependency added.
- Verification: 122 unit/storage tests pass; lint, typecheck, source/test formatting, diff checks and the production static build pass. Final Chromium chore/drag/integration regression passes 61 checks at 375/768/1280 px, with two intentional skips because real touch dragging is exercised on the phone only. Checks include pointer/keyboard moves, empty targets, same-column no-ops, outside/Escape cancellation, completion history, persistence/List agreement, storage retry, archive guards, cross-tab protection, real touch edge scrolling and focus after a move hides a filtered card.
- Broader regression initially passed 119 checks and exposed phone viewport leakage from offscreen screen-reader labels plus an existing agreement-menu focus race. Containing those labels within their card wrapper restores the phone viewport; explicit dialog return-focus targets fix agreement edit cancellation. The closing 61-check run covers both corrections. One earlier regression run was externally terminated; only its confirmed leftover test server was stopped before retrying with four workers.
- Reviewed desktop and phone card screenshots; previews are saved under `/tmp/roomieos-kanban-review/`. Portal menu events are excluded from card drag initiation, and touch dragging is confined to the handle so ordinary board scrolling remains available. No dependency, domain action, storage key or schema changed.
- Manual review: drag a card into Completed, inspect its history, drag it back and refresh; try Space/arrows/Enter and Escape on a handle. On a phone, drag from the handle toward the board edge and confirm the page itself stays within the viewport. Within-column reordering remains unchanged. Chromium only; no deployment performed.

### Board-only chores and status tags — 24 November 2026

- User explicitly removed the List view and per-card status dropdowns. This supersedes earlier List + Kanban requirements. Chores now has one draggable board; each card displays the existing colored/icon-labeled StatusPill. Keep status/roommate filters, pointer/touch/keyboard dragging and the detail dialog's status buttons.
- Removed view state/switcher/list rendering and the board status-control callback. No domain/store/schema changes. Browser checks now exercise detail actions and status tags, and assert that the List switcher and card dropdowns are absent.
- Verification: 122 unit/storage tests and 61 Chromium chore/drag/integration checks pass at 375/768/1280 px, with two intentional skips for phone-only real touch coverage. Lint, typecheck, formatting, diff checks and the production static build pass. Detail status actions, tags, drag completion history, touch/keyboard moves, failed saves, cross-tab protection, archived assignments, filters and refresh persistence remain covered.
- Reviewed the desktop status-tag layout; screenshots for desktop/tablet/phone are saved under `/tmp/roomieos-board-only-review/`. Manual review: open Chores and confirm the switcher/card dropdowns are gone, move a card and check its tag, then open details to change status and refresh. Chromium only; no deployment performed.

### Sidebar polish — 24 November 2026

- User requested a more polished sidebar informed by Vercel's dashboard navigation and explicitly rejected the detached collapse/expand control. Put the desktop control in the sidebar header, including a visible expand control within the collapsed rail; the content header retains only the mobile menu trigger.
- Align the brand/header, introduce read-only household context, organize primary links under Workspace and Settings/About as footer utilities, tighten icon alignment and footer disclosure, retain RoomieOS colors and all five routes. No fake workspace selector, resizing feature or additional navigation introduced. Temporary collapse and 1024px mobile Sheet behavior remain.
- Move the Next.js development indicator to bottom-right so it does not obscure sidebar footer controls. Use the installed Next.js devIndicators guide; keep development diagnostics available.
- Reference: https://vercel.com/changelog/dashboard-navigation-redesign-rollout (official screenshot inspected); use its navigation hierarchy and restrained styling as inspiration.
- Verification: 122 unit/storage tests pass; lint, typecheck, source/test/config formatting, diff checks and production static build pass. Shell/navigation/setup Chromium suites pass 44 checks with one intentional desktop mobile-drawer skip. After final 80px header alignment, the closing shell/navigation regression passes all 14 applicable checks with that same skip.
- Checks at 375/768/1280px cover control placement/containment, collapsed links/tooltips, Settings from the rail, a 600px-height footer, mobile explicit close/route dismissal/focus, all routes/reloads, perspective switching and household/storage flows. Expanded/collapsed/mobile screenshots were reviewed after settling animations; previews are saved under `/tmp/roomieos-sidebar-review/`.
- Manual review: collapse/expand from within the sidebar, navigate while collapsed, open/close mobile navigation, and inspect footer tools in a shorter window. Collapse state stays temporary, and no household facts/schema/storage keys changed. Chromium only; no deployment performed.
