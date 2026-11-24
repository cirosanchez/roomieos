# RoomieOS — Product Requirements Document

**Version:** 1.1 · **Project:** ENTI 407 Creation Project · **Target:** Friday, 27 November 2026  
**Product type:** Interactive, client-side prototype (not a deployed multi-user service)  
**Status:** Approved product decisions; implementation-ready

**Amended 23 November 2026:** User-approved expansion to 2–20 active roommates and 40 named, grouped preset avatar icons plus initials. Existing local data stays compatible with schema version 1.

**Amended 24 November 2026:** The user explicitly replaced List + Kanban chores with a board-only view. Remove the view switcher and per-card status dropdowns; show status tags on cards. Retain status/roommate filters, pointer/touch/keyboard dragging and status actions in the detail dialog. This supersedes earlier references to chore List views and card dropdowns below; household behavior and persistence remain unchanged.

## 1. Product summary

**Tagline:** Your shared home, organized.

RoomieOS is a lightweight household workspace for **university students living with roommates in apartments or residence units**. It combines household chores, shared expenses and house agreements in one understandable interface. A roommate chooses their profile from a switcher and can see their responsibilities alongside household-wide information.

**Core problem:** Shared households coordinate through fragmented group chats, memory and spreadsheets. Tasks get forgotten, purchases are hard to split, and agreed expectations are difficult to find.

**Value proposition:** One place to see who is doing what, who owes whom, and what the household agreed to—without requiring a complicated setup.

**Prototype disclosure:** There is **no authentication or shared backend**. The profile switcher simulates perspective only; it is not identity verification. Data is saved **only in the current browser**, never synchronized between roommates/devices. Use honest language in the app and presentation.

## 2. Outcomes and success criteria

The MVP succeeds when a first-time visitor can:

1. Open a public URL without signing in, and choose between a realistic sample household and starting with an empty one.
2. Manage a household of **2–20 active roommates** with names and avatars.
3. Create, edit, complete, skip, rotate and remove chores; see them in list and Kanban views; inspect completion history.
4. Record expenses with **multiple payers** and **equal, percentage or fixed-amount splits**; see correct simplified balances; settle or reopen an expense.
5. Add, edit and remove simple house agreements.
6. Use a dashboard that combines the selected roommate's information with the overall household picture.
7. Refresh the page and find all changes preserved locally, including settings and profile selection.
8. Use the app on laptop and phone without broken controls or layout.

**Assignment deliverables (per supplied ENTI 407 guide):** live/preview link; <=5-minute user-perspective video; complete dated prompt log, with PRD and design appendices if helpful. App quality criteria: usefulness, usability, functional persistence and interactions, lack of bugs, innovation and visual polish.

## 3. Explicit boundaries

### In scope (must ship)
- One household per browser; first-run choice between sample data and an empty household.
- Household name and household currency; **2–20 active roommates**; avatars as preset icon/emoji/initials or optional uploaded photo.
- Roommate perspective switcher (non-authenticated).
- Dashboard with personal and household summaries; **no activity feed**.
- Chores CRUD, notes, due dates, assignment, statuses (pending/completed/skipped), list + Kanban, overdue indication, manual next-person rotation, completion history.
- Expenses CRUD; categories and optional notes; multiple payers; three split methods; simplified outstanding balances; whole-expense settled/open state.
- Simple agreements CRUD.
- Local persistence, sensible sample data, destructive-action confirmations, reset and start-over flows, accessible responsive UI.

### Out of scope (do not build unless explicitly requested)
Authentication, invitations, cross-device or real-time collaboration, database/server, API integrations, notifications, payment processing, chat, AI features, scheduled/background chore recurrence, recurring expense automation, foreign exchange conversion, partial settlements, receipt uploads, audit-grade finances, native mobile apps, multiple households, analytics, or a full permission model.

### Recommended implementation constraints
Next.js + TypeScript + Tailwind CSS + Lucide icons (`lucide-react`); `localStorage`; no network calls required for application behavior. Deploy as a static site on Vercel. Prefer small readable functions to elaborate architecture.

## 4. Information architecture and user journeys

**Navigation:** Dashboard / Chores / Expenses / Agreements / Settings. Household name and roommate switcher always accessible; Settings holds roster, currency, and reset.

### Journey A — First-time visitor
1. The app has no saved data. Show a focused welcome setup with **Try sample household** and **Start from scratch**.
2. **Sample**: initialize 3 named roommates with varied avatars, 4–6 chores across statuses, 3–4 valid expenses including a multi-payer example, and 2–3 house agreements. Pick one roommate as active.
3. **From scratch**: ask for household name, currency, and **at least two roommate names** (avatar optional). Start with no chores, expenses or agreements. Select first roommate.
4. Persist the chosen household and profile. Never overwrite changes on subsequent visits.

### Journey B — Manage chores
1. Open Chores, switch between list and Kanban.
2. Create a chore with required title, assignee, due date; optional notes.
3. Edit or remove it; mark Pending, Completed or Skipped.
4. On completion, record who completed it (the selected profile) and when.
5. On rotation, assign the **next active roommate in household roster order**, wrap around, reset status to Pending and request/offer a new due date. Preserve prior completion events.
6. Overdue applies only to Pending chores with due dates earlier than the current *local calendar date*.

### Journey C — Record a shared expense
1. Create an expense: description, positive amount, date, category, optional notes.
2. Add **one or more payers**, each with a contribution amount. Contributions must add exactly to total.
3. Choose participants, then split method: **Equal**, **Percentage**, or **Fixed amounts**. Participants' shares must add exactly to total.
4. Save, view expense breakdown, and inspect **Who owes whom** on Expenses.
5. Mark an expense **Settled** only when its obligations have actually been handled outside the app; this removes its amounts from outstanding balances while preserving it in history. A settled expense can be reopened.

### Journey D — Switch perspective and maintain household
1. Switch profile without logging in. Dashboard's **My chores** and **My balance** update immediately; shared household information does not change.
2. Rename household, edit/add/remove roommates in Settings, and change currency only under the currency safeguards below.
3. Reset sample data with confirmation, or choose Start over to return to first-run choice.

## 5. Functional requirements and acceptance criteria

Requirements use `FR-*`. Each acceptance criterion should be manually testable and, where possible, covered by a unit/component test.

### 5.1 Setup and persistence

**FR-01 — First-run choice**
- With no valid stored state, the welcome screen offers Sample or Empty; neither silently chooses for the visitor.
- Sample data is internally consistent; Empty creates an otherwise blank household after entering a name, currency and 2–20 roommates.

**FR-02 — Local persistence**
- All changes to household, selected profile, chores, expense statuses and agreements survive a refresh in the **same browser**.
- A browser with no saved data shows first-run setup; malformed/unsupported saved data shows a recoverable error with a user-confirmed reset rather than a blank or crashed app.
- Changes on one browser/device are not described or represented as synchronized elsewhere.

**FR-03 — Reset/start over**
- **Reset demo** restores original sample household data, after a confirmation explaining that local changes will be lost.
- **Start over** clears the current household after a confirmation and returns to the first-run setup. Both actions work without server requests.

### 5.2 Household and roommates

**FR-04 — Household settings**
- Household name can be edited (trimmed, non-empty, max 60 characters).
- Household currency can be chosen from **CAD, USD, EUR, GBP**; default CAD. All financial records use **one household currency**. Currency change is allowed only when **no expenses exist** (including settled expenses); show the reason when blocked. No exchange-rate conversion.

**FR-05 — Roster and avatars**
- Add, edit, remove-from-active-roster (archive), and restore roommates; maintain **2–20 active members**. Name is required, trimmed, 1–40 characters.
- Show avatar initials or one of 40 named preset icons/emojis, grouped by Nature, Animals, Food & drink, Hobbies, and Home & favorites; optionally allow a small uploaded image that is resized/compressed and saved locally (max stored thumbnail about 128 px; gracefully reject invalid/oversized images). No cloud upload or external image dependency.
- Active roommates are eligible for new chore assignments, payer entries and expense splits. Historical records retain references to archived roommates.
- Archiving requires at least two other active members to remain. Block archive if the member has a **Pending chore** assigned or appears in an **unsettled expense**; explain that chores must be reassigned and expenses settled first. Completed/skipped chores and settled expenses remain visible with archived names. Archived members can be restored if the active-roster limit permits.

**FR-06 — Profile switcher**
- The switcher lists active roommates with avatar + name; selecting another immediately updates personal dashboard summaries and defaults for newly created transactions where appropriate.
- If the selected roommate is archived, automatically select the first active roommate. State clearly that switching is a **demo perspective**, not a secure account.

### 5.3 Chores

**FR-07 — Chore CRUD**
- Create a chore with title (required, <=100 chars), assignee (active roommate), due date (valid date, ISO `YYYY-MM-DD`), notes (optional, <=1000 chars); default status Pending.
- Users can read, edit and delete chores. Delete requires confirmation and removes that chore's completion history. Invalid input displays inline errors and saves nothing.

**FR-08 — Chore statuses and history**
- Exactly three statuses: **Pending**, **Completed**, **Skipped**. List and Kanban both show same underlying chores.
- Completing a chore records a history event `{completedById, completedAt}` using the current profile. Reopening a completed or skipped chore to Pending does **not** erase previous completion events. Re-completing adds another event.
- A Chore details view shows a chronological completion history, including member names and dates, even after rotation.

**FR-09 — Chore rotation**
- Pressing **Rotate to next** picks the next *active* roommate after the current assignee in stable roster order, wrapping to the beginning. Skips archived members.
- Rotation sets status to Pending and lets the user confirm a new due date (default suggestion: seven days after the previously scheduled date, or seven days from today if the previous date is past). Notes/title/history remain unchanged.
- For a single-remaining next candidate this still works (2 active minimum); no automatic background rotations or scheduler.

**FR-10 — Views, filtering and overdue**
- List view shows title, assignee, due date and status; supports status and assignee filters.
- Kanban has **Pending / Completed / Skipped** columns and allows changing status using clear controls (drag/drop is optional polish, not a requirement).
- Only Pending chores dated before today are marked **Overdue**; due today is not overdue. Responsive mobile view allows access to all columns without clipped inaccessible content.

### 5.4 Shared expenses and settlements

**FR-11 — Expense CRUD**
- Create/edit/delete expense with required description (<=100 chars), positive amount, date and category; notes optional (<=1000 chars).
- Every expense has at least one active payer and at least one active participant at creation. Payers may also be participants but need not be.
- Payer contributions are each positive and their total must equal the expense total; invalid sums prevent saving and display discrepancy in currency units.

**FR-12 — Split methods**
- **Equal:** divide total into integer cents between selected participants. Assign any remainder cents deterministically by stable participant order.
- **Percentage:** user enters percentages (up to two decimals), summing to exactly 100.00%; convert to integer cents using largest-remainder allocation with a stable tie-breaker. The displayed per-person cents must total exactly the expense amount.
- **Fixed:** user enters each participant's share in currency units to two decimal places; sum must equal total exactly.
- If the total, participants, payers or split method changes, revalidate both payer contributions and participant shares; do not silently save an inconsistent edit.

**FR-13 — Ledger and simplified balances**
- Store money internally as **integer minor units (cents)**. No floating-point financial accumulation.
- For each **unsettled** expense: member net = payer contributions minus participant share. Sum of nets across all members must be zero.
- Aggregate nets over all open expenses; positive nets are creditors, negative nets are debtors. Generate a deterministic simplified list of debtor -> creditor transfers using a greedy matching algorithm (largest absolute balances first; stable roommate ID/name tie-breaker).
- Show both **My net position** for selected roommate and **Who owes whom** for the household. A $45 expense paid by A and split equally among A/B/C gives A +$30, B -$15, C -$15 (two $15 transfers to A).
- Simplification is advisory netting, not a payment request or guaranteed minimum number of transfers.

**FR-14 — Expense settlement semantics**
- An expense is either **Open** or **Settled**. Mark Settled requires confirmation that the full expense has been resolved outside RoomieOS.
- Settled expenses remain listed and editable/viewable but do **not** contribute to outstanding balances. Reopening restores their effect. This is not a record of partial payments or pairwise settlements.
- If a settlement status changes, the balances and dashboard update without refresh, and remain correct after refresh.

**FR-15 — Categories and currency formatting**
- Category preset examples: Groceries, Utilities, Household supplies, Rent, Other.
- Display localized amount formatting with the household currency code when clarity requires (e.g. `CAD 12.50`). Store all numeric data independent of display formatting.

### 5.5 Agreements

**FR-16 — Agreements CRUD**
- Add, edit, delete and list simple agreements with required title (<=100 chars) and optional details (<=1000 chars).
- Show a clear empty state. Delete requires confirmation. No categories, approval workflow or signature requirement.

### 5.6 Dashboard, usability and robustness

**FR-17 — Dashboard**
- Show household name and selected roommate; cards for **My pending chores**, **My outstanding net balance**, **Household outstanding expense total or open-expense count**, and **Upcoming chores**.
- Show a compact household-wide snapshot (e.g. pending/completed chores and open expenses); figures are derived from actual state, not hardcoded sample-only numbers.
- No activity feed or fabricated statistics. Empty households show helpful calls to action.

**FR-18 — Navigation, feedback and accessibility**
- All pages work at approximately **375px mobile** and **1280px desktop** without horizontal page overflow; mobile Kanban may scroll its own board region.
- All controls have readable labels, visible focus states, keyboard-operable dialogs and status actions, sufficient contrast, and clear form errors.
- Every user action gives visible confirmation/updated state; destructive actions require confirmation. No dead buttons or placeholder interactions.

## 6. Data model (TypeScript-oriented reference, not a database schema)

Use a single versioned, serializable root object persisted in `localStorage`; IDs are stable strings (e.g. `crypto.randomUUID()` where available). The structures below describe behavior; implementation names may vary.

```ts
type Currency = 'CAD' | 'USD' | 'EUR' | 'GBP';
type ChoreStatus = 'pending' | 'completed' | 'skipped';
type SplitMethod = 'equal' | 'percentage' | 'fixed';
type ExpenseStatus = 'open' | 'settled';

type Member = {
  id: string;
  name: string;
  avatar: { kind: 'initials' | 'icon' | 'image'; value: string };
  active: boolean;
  order: number; // stable roster ordering
};

type CompletionEvent = { id: string; completedById: string; completedAt: string };
type Chore = {
  id: string;
  title: string;
  notes: string;
  assigneeId: string;
  dueDate: string; // YYYY-MM-DD, local-calendar date
  status: ChoreStatus;
  completionHistory: CompletionEvent[];
  createdAt: string;
};

type Contribution = { memberId: string; amountCents: number };
type ParticipantShare = { memberId: string; amountCents: number };
type Expense = {
  id: string;
  description: string;
  amountCents: number;
  date: string;
  category: string;
  notes: string;
  payers: Contribution[];
  participants: ParticipantShare[]; // calculated/validated, always sums to amountCents
  splitMethod: SplitMethod;
  percentageBasisPoints?: Record<string, number>; // if method = percentage
  status: ExpenseStatus;
  createdAt: string;
};

type Agreement = { id: string; title: string; details: string };
type AppState = {
  schemaVersion: 1;
  household: { name: string; currency: Currency };
  members: Member[];
  selectedMemberId: string;
  chores: Chore[];
  expenses: Expense[];
  agreements: Agreement[];
  starterMode: 'sample' | 'empty';
};
```

**Storage key:** `roomieos:v1`. Validate the structure when loading; keep sample seed data in code, not embedded as immutable UI numbers. Keep all derived balances and dashboard counters computed from stored facts. Do not store duplicate totals that can drift out of sync.

**Local images:** Restrict to compressed thumbnails. If storage quota is exceeded, show an error without discarding the current state; offer icon/initials as a fallback. Never depend on remote avatar URLs.

## 7. Financial invariants (critical tests)

1. For every valid expense, `sum(payers.amountCents) === amountCents`.
2. For every valid expense, `sum(participants.amountCents) === amountCents`.
3. With only open expenses, `sum(all member net balances) === 0`.
4. Total debts in a simplified transfer list equal total outstanding credits, in cents.
5. Reopening the same settled expense restores exactly the previously excluded balances.
6. Equal split of **100 cents across 3 people** yields `{34, 33, 33}` in deterministic order.
7. Payer and participant roles may overlap or differ; a member's net can be positive, negative or zero.
8. An expense with two payers contributing 3,000 and 1,500 cents, split equally among three, gives payer nets +1,500 and 0; third person's net -1,500.

## 8. Interface screens

- **Welcome:** Choose sample vs empty. Empty asks household name, currency and 2–20 roommates.
- **Dashboard:** Household title, current-profile switcher, personal summary cards, upcoming chores, concise household overview.
- **Chores:** List/Kanban toggle, filter controls, add/edit modal or sheet, details/history, status buttons, rotation.
- **Expenses:** Household balances, expense list, add/edit form with payer + participant builders and split-method tabs, settlement confirmation and breakdown.
- **Agreements:** Clean document-like list of editable titles/details.
- **Settings:** Name, currency, roster with avatars, archive/restore, sample reset and start over.

## 9. Demo data contract

Sample mode should be convincing, not random. Example household: **Maple House**, currency **CAD**, with Avery, Jordan and Sam. Seed:
- Pending chores (including one overdue relative to current local date), one completed chore with a completion event, and one skipped chore.
- Several expenses in different categories, at least one with two payers and one using a non-equal split; keep all amounts internally consistent.
- Both Open and Settled expenses so the balance calculation and settlement functionality can be demonstrated.
- Quiet hours, cleaning supplies and guest etiquette agreements.

Seed due dates **relative to first-run local date** so the demo doesn't become stale. Seed data only upon selection or explicit reset; do not regenerate it on each render or refresh.

## 10. Delivery plan and checkpoints

**Phase 0 — Document and plan (Mon 23 Nov):** finalize PRD, DESIGN and AGENTS; ask Codex for an architecture + sequencing plan only; initialize repo, commit.

**Phase 1 — Foundation (Tue):** Next.js/TypeScript/Tailwind/Lucide, design shell, first-run flow, roster, selected member, validated versioned persistence; build passes; commit.

**Phase 2 — Chores (Tue):** CRUD, notes, statuses, history, rotation, list/Kanban, overdue; manual test refresh and mobile; commit.

**Phase 3 — Expenses (Wed):** expense form and all split methods, validations, cents arithmetic, net ledger, settlement and reopening; unit tests for money math; commit.

**Phase 4 — Integration (Wed):** dashboard, agreements, settings, sample reset, polish; commit.

**Phase 5 — Ship (Thu; Friday buffer):** accessibility and mobile checks, private-window deployment test, video <=5 minutes, dated complete Codex prompt transcript and appendices; submit as required by D2L.

If time runs short, preserve: working setup + CRUD persistence, accurate expense math, chores, dashboard, responsive UI and submission materials. Defer photo uploading, drag/drop, complex transitions and other decoration first.

## 11. Acceptance test checklist

- [ ] Opening the link in a private window shows first-run choice, with no login.
- [ ] Sample data and empty setup both initialize correctly and do not overwrite existing saved data.
- [ ] Refresh preserves household, profile, roster, chores, expenses, settlements, agreements, currency.
- [ ] Add/rename/avatar/edit/archive/restore roommates; limits 2–20 active enforced.
- [ ] Archiving a member with open obligations is prevented with a useful explanation.
- [ ] Switch profile; personal dashboard changes without modifying shared data.
- [ ] Create/read/edit/delete chores; statuses pending/completed/skipped work in list and Kanban.
- [ ] Completion history survives reopening and rotating a chore.
- [ ] Rotation follows active member order; overdue state is correct today vs before today.
- [ ] Create/read/edit/delete expense; all three split methods valid and invalid inputs rejected.
- [ ] Multiple payer contributions sum to expense total; no cents lost from rounding.
- [ ] Simplified balances correct for one expense and multiple offsetting expenses.
- [ ] Settling/reopening an expense changes balances and persists.
- [ ] Currency choice works before expense entry and blocks unsafe changes afterward.
- [ ] Create/read/edit/delete agreement; appropriate empty state.
- [ ] Reset demo restores original sample, start over returns to choice (both confirmed).
- [ ] Functional at 375px and 1280px; tab navigation, dialog focus and clear errors checked.
- [ ] Build succeeds; no important console errors; all visible actions work.
- [ ] Public deployed link works; video and complete dated prompt log are prepared.

## 12. Explicit trade-offs / known limitations

- **Local-only:** Other devices won't see the same household state. Profile switching is not access control.
- **No money movement:** Settlement is a user-declared whole-expense state. Real payments happen outside the app.
- **One currency at a time:** No exchange rates; historical entries keep their stated unit.
- **No scheduling service:** The Rotate button advances a chore manually; no automatic weekly jobs.
- **No backend security model:** Avoid any claim that RoomieOS protects real shared household financial records.
- **Prototype scope:** Product direction can suggest future collaboration features, but they are not part of Friday's build.
