# RoomieOS implementation plan

**Last updated:** 25 November 2026

**Status:** Approved usability improvements implemented and verified. Release deployment and submission deliverables remain pending.

**Current milestone:** Usability follow-up complete — expense search/status filters, unsaved-form protection and dashboard shortcuts/urgency.

**Next milestone:** Milestone 6 — release verification and submission deliverables.

**Delivery target:** Thursday, 26 November 2026; Friday, 27 November is the submission/fix buffer.

## 1. Purpose, authority and decisions

Build a polished Next.js client-side prototype for ENTI 407. `docs/PRD.md` is authoritative for behavior; `docs/DESIGN.md` is authoritative for UI/UX. This document records approved architecture, sequencing and actual progress. It does not override those requirements.

At plan approval, the repository contained documentation and a README, with no application scaffold. The foundation, household setup/persistence, chores, expenses, agreements and integrated dashboard are now implemented; see the progress record below for verification. Update this record after each working slice: check only completed work, record actual verification, and keep the current/next milestone accurate. Surface conflicts or new scope for user review rather than inventing requirements.

### Resolved requirements and defaults

- **Approved usability additions (25 November 2026):** The user selected recommendations 1–3: description search and All/Open/Settled expense filters, discard confirmation for edited chore/expense/agreement forms, and actionable dashboard cards with selected-roommate overdue/due-today counts. Filters are temporary display state; balances still derive from all open expenses.

- **Approved demo entry flow (24 November 2026):** Add a public landing page, hidden-credential client-only demo login and explicit logout. Persist only the demo-login flag in `localStorage["roomieos:demo-login"]` until logout; household data remains solely in `roomieos:v1`. Guard setup/workspace routes, retain deep-link destinations, and move Dashboard to `/dashboard`. This is a presentation gate, not real authentication or an account system.

- **Approved Milestone 2 expansion:** The user raised the active-roommate limit from 5 to 20 and requested more avatar choices. The current limit is **2–20 active roommates**, with 40 named/grouped emoji presets plus initials. PRD and DESIGN version 1.1 now reflect this explicit user-approved change from the original 2–5 limit. Existing saved avatar values and `schemaVersion: 1` remain compatible.
- **Backend conflict resolved:** The user selected the approved local-only scope. Use Next.js App Router without backend API routes, Server Actions, authentication or a database. Household operations run in the browser.
- **History ordering:** Preserve completion events in append order; display newest first, as DESIGN specifies.
- **Archived-member edge cases:** Historical records remain viewable and editable without losing member references. Before reopening an expense involving archived members, require their restoration. Before reopening a chore assigned to an archived member, require reassignment to an active member. Rotation can directly select the next active member.
- **Design contrast:** Preserve the visual palette, but use sufficiently dark text variants where muted tokens fail contrast requirements.
- **Priority:** All PRD must-haves remain MVP requirements. Defer photo uploads and decorative animation. The user explicitly approved dependency-free chore-card dragging during UI review on 24 November 2026.

## 2. Architecture and state

Use Next.js App Router, TypeScript, Tailwind CSS and `lucide-react`, with static deployment on Vercel.

### Application structure

- **Routes (`src/app`):** `/` for the public landing page, `/login` for simulated login, `/dashboard` for Dashboard, plus `/welcome`, `/chores`, `/expenses`, `/agreements` and `/settings`. A client initialization gate shows loading until storage is read, then presents setup, recovery or the requested screen.
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

### Selected-roommate chore boards — 24 November 2026

- User explicitly removed status/roommate filters and requested that Kanban follow the currently selected demo roommate. Derive cards/count from selectedMemberId across all three statuses; perspective changes update immediately and persist through the existing profile action. No per-view filter state or new storage fields.
- Keep a helpful personal empty state and New chore defaulting to the selected roommate. Reassignment/rotation may move a card off the current board; retain its open details until closed and restore focus to New chore when its trigger disappears. Cancel transient drag state on perspective changes.
- Preserve historical archived-member access through a Chore history action on archived roster entries in Settings, reusing the existing detail/edit/rotation dialogs and guards. Active roommates' records remain reachable by switching perspective; no all-household filter added back.
- Verification: 122 unit/storage tests pass, along with lint, typecheck, source/test formatting, diff checks and the production static build. The broader chore/drag/integration/setup run passed 90 checks and exposed one phone long-name overflow; after adding wrapping, the closing chore/drag/integration regression passes all 61 checks, with two intentional skips for phone-only real touch coverage.
- Checks at 375/768/1280px cover removal of both filters, profile isolation/switch/refresh without modifying shared chores, 40-character-name personal empty states, selected-profile form defaults, preserved completion history through reassignment/rotation, archived history editing/guards, all-status tags, pointer/touch/keyboard moves and gesture cancellation on perspective changes. Existing setup/roster/storage flows also passed in the broader run.
- Reviewed the personal desktop board screenshot; previews for desktop/tablet/phone are saved under `/tmp/roomieos-personal-board-review/`. Manual review: switch demo perspectives, refresh, add a chore and confirm the default assignee; reassign/rotate a chore and check that it appears on the new assignee's board. Archived roster entries with chores expose Chore history in Settings. Chromium only; no deployment performed.

### Expense balance summary — 24 November 2026

- User requested red negative net amounts when owing, green unsigned positive amounts when owed, and readable perspective-relative sentences. Keep zero neutral. Replace the selected-name/colon caption with a total naming the relevant counterparties, derived from existing simplified transfers.
- Prioritize selected-roommate transfer sentences (You owe amount to name / name owes you amount); retain unrelated balances in Other household balances. Keep currency explicit, open-only arithmetic and outside-app whole-expense settlement semantics unchanged. No form, ledger, schema or action changes.
- Verification: 122 unit/storage tests and all 45 Chromium expense/integration checks pass at 375/768/1280px. Lint, typecheck, source/test formatting, diff checks and production static build pass. New browser coverage checks red -CAD 60.00 split into CAD 40.00/CAD 20.00 sentences, green unsigned creditor amounts, neutral zero with unrelated household debts, profile switch/refresh and unchanged expense records. Existing rounding, settlement/reopen, storage-failure, archived-role and large-household regressions pass.
- Reviewed the desktop summary screenshot; desktop/tablet/phone previews are saved under `/tmp/roomieos-expense-summary-review/`. Manual review: switch among a debtor, creditor and even roommate, then settle/reopen an expense and refresh. Keep household currency explicit. Forms, dashboard card presentation and domain calculations remain unchanged; Chromium only and no deployment performed.

### Selected-roommate-only expense summary — 24 November 2026

- User requested only the selected roommate's transactions after reviewing the expense summary. Remove Other household balances from the balance panel and show only simplified transfers involving selectedMemberId. Use a personal zero-balance empty state even when other roommates have outstanding balances.
- Keep integer-cent netting across the complete household before filtering suggested transfers; do not filter expense inputs to the calculation. Expense records, currency, settlement and saved state remain unchanged in this summary slice.
- Verification: 122 unit/storage tests and all 24 Chromium expense checks pass at 375/768/1280px. Lint, typecheck, formatting, diff checks and production static build pass. Checks assert unrelated names/transfers are absent, personally even roommates see no suggested-transfer rows despite other household debts, profile switch/refresh works, and records/calculations/settlement remain unchanged. Manual review: switch among a debtor, creditor and even roommate and inspect the summary. Chromium only; no deployment performed.

### Topbar and roommate-switcher polish — 24 November 2026

- User requested a modern topbar using shadcn, especially the roommate changer. Replace the labeled select and duplicate avatar with one shadcn/Base UI avatar/name menu trigger. Keep Demo perspective visible, show active roommates with avatars and a selected checkmark, and disclose browser-only saving in the menu footer.
- Refine desktop breadcrumb hierarchy, icon treatment and header spacing while preserving the aligned 80px header and mobile navigation. Bound the menu to the viewport and 28rem height, scroll only the roster, wrap long menu names and truncate the trigger/household context. Keep the existing save-before-publish selection action, archived-member exclusion and stale-tab guards.
- Verification: 122 unit/storage tests, lint, typecheck, source/test formatting and diff checks pass. `npm run build -- --webpack` passes and exports static pages. Default Turbopack builds fail when starting their CSS worker with Operation not permitted, including escalated retries; the supported Webpack build verifies production output without changing project configuration.
- The broader shell/setup/navigation run passed 41 checks with one intentional desktop drawer skip and exposed a menu-label ambiguity in the 20-roommate case. Corrected the label and explicit close-on-selection behavior. The closing targeted Chromium run passes all 9 checks at 375/768/1280px, covering keyboard selection/focus, Escape without a write, refresh persistence, long names, archived-member exclusion, full-roster scrolling and the existing 20-roommate setup/archive/restore flow. Tests also assert shared records remain unchanged by perspective switching.
- Reviewed desktop, tablet and phone screenshots, including the full roster menu. Manual review: open the topbar switcher, select another roommate with pointer or keyboard, refresh, and inspect mobile navigation and long-name truncation. Next slice: continue component review or Milestone 6 release verification. Chromium only; no deployment performed.

### Ephemeral bottom-right feedback — 24 November 2026

- User requested that the feedback banners move to the bottom-right corner and disappear after 3 seconds. Render household success/error feedback as a fixed, responsive toast outside the main content so it no longer shifts page layout. Retain accessible status/alert semantics, long-message wrapping and an explicit close button.
- Start a fresh 3-second timeout for each store publication, including repeated identical messages; cancel the old timeout on replacement, dismissal or unmount. This affects transient household feedback only; inline form errors and storage-recovery/conflict flows remain in their existing locations.
- Move the development indicator to bottom-left after browser checks found it intercepted the toast close button in bottom-right. Followed the installed Next.js devIndicators guide; development diagnostics remain available.
- Verification: lint, typecheck, source/test/config formatting and diff checks pass. The production static build passes with `npm run build -- --webpack`; retain the previously recorded Turbopack environment limitation. The closing Chromium run passes all 9 checks at 375/768/1280px: viewport anchoring, no vertical layout shift, expiry, replacement with the same message, pointer dismissal, failed-save feedback without saved-state mutation, and failed setup/settings writes retaining drafts for retry. No domain/storage behavior changed; unit tests were not rerun for this UI slice.
- Reviewed phone and desktop toast screenshots. Manual review: switch roommates and wait 3 seconds, switch again before expiry, dismiss with the close button, and try the same flow on a phone. Next slice: continue component review or Milestone 6 release verification. Chromium only; no deployment performed.


### Landing page and persistent demo login — 24 November 2026

- Implemented the approved public landing page at `/` with RoomieOS branding, a short hero, three feature summaries and working login/Get started links. Added a centered shadcn-based demo login at `/login`, with empty labeled required fields, a password visibility toggle, inline errors and no displayed credentials. Both pages disclose the local-only prototype.
- Move Dashboard to `/dashboard`; update navigation, brand/return links and household redirects. A root demo-login provider checks the exact approved credentials client-side and persists only `roomieos:demo-login=true`. Setup/workspace gates wait for initialization and redirect signed-out visitors to login, preserving allowlisted workspace deep links. The login page routes returning visitors directly into the app; the landing page stays public.
- Add Log out of demo to expanded/collapsed/mobile navigation. Logout removes only the separate flag and propagates across tabs. Failed login writes or logout removals show actionable errors without changing the prior login state. Household schema, selected roommate and all saved records remain unchanged; existing recovery/reset/start-over flows stay intact. This is a simulated presentation gate, not real authentication.
- Record the approved entry-flow exception in PRD/DESIGN and the plan's architecture/decisions. Existing browser suites now use a shared logged-in fixture and the relocated dashboard URL; new entry-flow tests exercise the form and guards directly without that fixture.
- Verification: 122 unit/storage tests pass; lint, TypeScript, formatting and diff checks pass; `npm run build -- --webpack` passes with all static routes exported. All 9 new Chromium login checks pass at 375/768/1280px, including blank/hidden credentials, incorrect credentials, password visibility, first-run choice, reload persistence, deep links, cross-tab logout and storage failures. The closing full Chromium regression passes 147 checks with 3 intentional viewport-specific skips (desktop drawer and non-phone touch dragging). Existing setup/recovery, chores/drag/history, expenses/settlement, agreements, perspective switching, notifications, storage failures and cross-tab protection remain covered. Initial test-only failures from legacy dashboard URLs and ambiguous required-field labels were corrected before the passing run.
- Reviewed desktop, tablet and phone landing/login screenshots. Manual review: open `/` in a private window, log in with the supplied demo credentials, select sample or empty setup, refresh, then log out and back in to confirm the household is retained. Next slice: Milestone 6 release verification and submission deliverables. Chromium only; no deployment performed.

### Small UI follow-up — 25 November 2026

- User approved the four small UI improvements from the assignment review. Add narrow-layout Pending/Completed/Skipped column shortcuts with counts and a short swipe hint; these scroll the existing board without filtering or changing any chore. Keep keyboard drag instructions available to assistive technology and visible on wider layouts.
- Style chore-title buttons as blue, underlined links while retaining their existing detail dialogs, keyboard access and separate drag handles.
- Add an optional fixed action footer to the shared modal. Expense create/edit forms use it for Cancel and Save expense, with the submit button associated with the form by a unique ID. The form body scrolls independently; validation, save errors, focus management and persistence retain their existing behavior.
- Add a labeled screenshot of the real Maple House sample dashboard to the landing page, stored as a roughly 70 KB local JPEG with descriptive alternative text and explicit dimensions. Capture the production UI without development controls or transient messages. The image is a static sample preview, not a live household summary.
- Verification: all 122 unit/storage tests pass; lint, TypeScript, formatting and diff checks pass. Production static export passes with `npm run build -- --webpack`; the previously recorded default Turbopack environment limitation remains.
- Verification: the existing expense, Kanban drag, demo-login and foundation/navigation suites pass against the built static app at 375/768/1280px: 63 passed, with 3 intentional viewport-specific skips. Covers all expense split modes, save-failure draft retention, settlement/reopen, pointer/touch/keyboard moves, history, login and dialog focus/navigation.
- Additional isolated browser checks at 375/768/1280px verify that column shortcuts (including keyboard activation) scroll to their destination without changing saved records, chore titles open details, expense actions remain in view at the same position while scrolling, invalid submissions save nothing, successful submissions survive refresh, and the landing image loads without page overflow or console errors. Reviewed phone expense/board and desktop landing screenshots; review artifacts are under `/tmp/roomieos-ui-polish/`.
- Manual review: on a phone, use each column shortcut and open a chore; open a new expense, scroll through the split fields and confirm Cancel/Save remain visible; inspect the landing preview. Next slice: user-managed release/deployment, video and authentic prompt-log submission. Chromium only; no deployment performed.


### Expense discovery, draft protection and dashboard shortcuts — 25 November 2026

- User approved recommendations 1–3 from the app review. Add case-insensitive, trimmed description search and All/Open/Settled expense filters, result counts, Clear filters and a distinct no-matches state. Preserve date ordering, the complete household ledger and open-only balances. Keep detail dialogs open when editing/settlement/reopening moves their record outside the filter; restore focus to Add expense when the original trigger disappears. Filters remain temporary and reset on a fresh page load.
- Add one shared draft-close guard to create/edit chore, expense and agreement forms. Compare the complete current draft with its opening values, including payer/share entries and secondary fields. Changed forms ask Keep editing / Discard changes on Cancel, close, Escape and backdrop dismissal; Keep editing retains fields and returns focus. Untouched or fully reverted forms close immediately. Successful saves close directly; validation/storage failures retain the draft and existing retry behavior. The confirmation itself traps focus and defaults to Keep editing. This guards dialog dismissal; it does not persist drafts across navigation, refresh or logout.
- Make all three dashboard summary cards keyboard-operable route links with a visible arrow/focus/hover affordance. My pending chores opens Chores; both expense cards open Expenses. Derive selected-roommate overdue and due-today pending counts in the pure dashboard selector using an explicitly supplied local calendar date. Reuse existing focus/visibility/interaction date updates and keep all counts out of saved state.
- Verification: all 123 unit/storage tests pass, including new urgency/date/perspective/non-pending exclusions and unchanged-state assertions. Lint, TypeScript, source/test/config formatting and diff checks pass. The final production static export passes with `npm run build -- --webpack`; the existing default Turbopack environment limitation remains. Browser/build execution required escalation because sandboxed execution could not start the local test server or invoke TypeScript during the build.
- Verification: the broad Chromium run passed all 147 existing browser checks plus 21 new checks, with 3 intentional viewport-specific skips. Three new filter checks failed because the test queried the background accessibility tree while the details modal correctly hid it; an earlier assertion also compared rendered whitespace using inconsistent text APIs. Corrected both test assertions. After final filter styling, the closing expense/usability run passes all 48 checks at 375/768/1280 px, including all 24 new browser checks. Coverage includes combined filters/clear/no matches, keyboard filter activation, unchanged balances/records, settlement/reopening across filters and focus fallback, all four draft dismissal methods, Keep editing/discard/reverted drafts, nested confirmations/focus restoration, successful saves/refresh, card navigation, perspective switching and date changes. Existing financial splits, failed-save drafts, archived roles and cross-tab protections pass.
- Reviewed desktop and phone expense/filter, discard-dialog and dashboard screenshots; review copies are saved under `/tmp/roomieos-usability-review/`. README documents the new controls and temporary-draft behavior. Manual review: combine description search with each expense status and clear it; on a phone, edit an expense split, close it and choose Keep editing, then cancel/discard; try the same on a chore/agreement. Click or keyboard-activate dashboard cards, switch perspectives and compare urgency counts with due dates. Save a record and refresh, then check the empty household and mobile Kanban still work. Chromium only; deployment remains pending. Next slice: Milestone 6 release/deployment and authentic submission deliverables.
