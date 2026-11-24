# RoomieOS — Design System & Interface Specification

**Version:** 1.1 · **Design direction:** Calm, editorial workspace inspired by Notion (not a clone)  
**Theme:** Light-first · **Product personality:** Organized, approachable, quietly confident  
**Implementation:** Next.js + TypeScript + Tailwind CSS; shadcn/ui with Base UI accessible primitives and Lucide icons; deployed on Vercel

**Amended 23 November 2026:** Support 2–20 active roommates. Avatar selectors offer initials and 40 named emoji presets grouped by Nature, Animals, Food & drink, Hobbies, and Home & favorites, using the same accessible grouped selector in setup and Settings.

**Amended 24 November 2026:** Approved shared UI refresh uses shadcn/ui with Base UI, preserving the RoomieOS palette and page layouts. Desktop navigation starts expanded and supports an icon rail with tooltips. Mobile navigation uses a Sheet. Custom calendars and page redesigns are deferred to component review.

## 1. Design intent

**One sentence:** RoomieOS should feel like a thoughtfully designed shared notebook that happens to calculate expenses and manage chores.

Take inspiration from Notion's clarity: a paper-like work surface, restrained typography, predictable navigation, compact metadata and generous content spacing. Do **not** imitate Notion's logos, brand assets, exact layouts or microcopy. RoomieOS has its own identity, tailored around household coordination.

**Use visual restraint.** The content is the product; UI decoration should never compete with it. No glossy gradient dashboards, giant illustrations, game UI, neon badges, or unnecessary animations.

### Principles
1. **Readability before flair:** Clear text hierarchy; prominent page title; one primary action per screen.
2. **Friendly but useful:** Natural language and small moments of warmth; no forced jokes.
3. **Low cognitive load:** Strong defaults, few mandatory fields, visible next steps.
4. **Consistent views:** A chore looks like the same item in Kanban, details, and dashboard.
5. **Trustworthy financial UI:** Expose exact splits and payer contributions; never hide math behind a mystery number.
6. **Accessible by default:** Keyboard support, visible focus, contrast, non-color status labels and mobile tap targets.

## 2. Visual reference and identity

**Logo/wordmark:** A small rounded square containing a simplified `R` or house outline, followed by **RoomieOS**. Use local SVG/CSS, not a remotely hosted image. Tagline on welcome screen: *Your shared home, organized.*

**Illustration approach:** None required. Use avatars (initials, icon/emoji or uploaded thumbnails), simple Lucide icons and subtle surfaces. A small house glyph next to the household name is enough to communicate context.

**Application voice:** Plain, supportive, concise. Examples:
- `Good afternoon, Avery` (optional greeting, no hard-coded time assumptions)
- `Your chores` / `Everyone's expenses` / `House agreements`
- `No chores assigned to you. You're all caught up.`
- `This expense is settled. It no longer affects outstanding balances.`
- `Saved on this browser only` (visible in Settings or first-run helper)

## 3. Design tokens

Use these as CSS custom properties in `src/styles/tokens.css` (or equivalent Tailwind theme mapping). Preserve relative hierarchy if token syntax differs.

### Colors — light theme

| Token | Hex | Purpose |
|---|---|---|
| `--bg-page` | `#FFFFFF` | Main canvas |
| `--bg-sidebar` | `#F7F7F5` | Navigation rail |
| `--bg-subtle` | `#F9F9F8` | Gentle panels / hover base |
| `--bg-hover` | `#EFEFED` | Interactive hover |
| `--bg-selected` | `#E9EFFC` | Selected navigation / selected control |
| `--text-primary` | `#37352F` | Main text |
| `--text-secondary` | `#787774` | Secondary text / supporting labels |
| `--text-tertiary` | `#9B9A97` | Placeholders / metadata |
| `--border` | `#E9E9E7` | Fine dividers, controls |
| `--border-strong` | `#D9D9D6` | Active field outlines |
| `--accent` | `#315D9D` | Primary action / active navigation / links |
| `--accent-hover` | `#264A7D` | Primary action hover |
| `--focus` | `#315D9D` | Keyboard focus ring |
| `--success` | `#24735B` | Completed / settled |
| `--success-bg` | `#EAF5F0` | Completed badges |
| `--warning` | `#9A6017` | Due soon / skipped |
| `--warning-bg` | `#FFF3E4` | Warning badges |
| `--danger` | `#B64747` | Overdue / destructive |
| `--danger-bg` | `#FBEAEA` | Overdue backgrounds |

**Color behavior:** Default body text is charcoal, not pure black. Use blue sparingly for important interactive elements. Prefer neutral borders over excessive shadows. Never rely on red/green alone: always show a readable status label.

### Typography

- **Font:** `Inter`, if available locally/system-installed; otherwise `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Avoid making the app dependent on a remote font.
- **Body:** 14 px / 1.55; main content can use 15–16 px when appropriate.
- **Large page title:** 30 px / 1.2 / weight 700 (mobile 26 px).
- **Section title:** 18 px / 1.3 / weight 650.
- **Card title / emphasis:** 14–15 px / weight 600.
- **Overline / metadata:** 12 px / weight 500 / muted.
- **Financial numbers:** 24–28 px / weight 650; tabular numeral feature.
- **Buttons / nav:** 13–14 px / 500–600.
- **Never:** all-caps paragraphs or decorative, heavy display fonts.

### Geometry and spacing

- **Spacing unit:** 4 px. Preferred gaps: 8, 12, 16, 20, 24, 32, 40 px.
- **Sidebar:** 248 px expanded on desktop, collapsible to a 64 px icon rail; subtle right border. Collapse state is temporary. Below 1024 px, use a modal slide-over menu.
- **Top bar:** 80 px high, aligned with the expanded sidebar header; breadcrumb/location on left, active roommate switcher on right.
- **Main max width:** 1120 px with 40 px horizontal interior padding desktop, 20 px tablet, 16 px phone.
- **Card radius:** 10 px; **controls radius:** 7 px; **modal radius:** 12 px.
- **Buttons:** min height 36 px desktop; tap targets >=44 px on touch layouts.
- **Borders:** 1 px subtle divider; low contrast. **Shadows:** almost none (optional small dialog shadow only).
- **Tables:** row height approx 44–52 px; hover tint, sparse column dividers.

## 4. Application shell and navigation

### Desktop (>=1024 px)

```text
┌────────────────────┬──────────────────────────────────────────────────────────┐
│ R  RoomieOS        │ Maple House / Dashboard           [Avery ▾]             │
│                    ├──────────────────────────────────────────────────────────┤
│ ⌂  Dashboard       │                                                          │
│ ☑  Chores          │  🏠 Maple House                                          │
│ ◫  Expenses        │  A calmer way to share your space.                       │
│ ▤  Agreements      │                                                          │
│                    │  [My chores] [My balance] [Open expenses]               │
│                    │                                                          │
│ ─────────────────  │  Upcoming chores                  Household snapshot      │
│ ⚙  Settings        │  ┌─────────────────────────┐      ┌───────────────────┐   │
│                    │  │ Clean kitchen ...       │      │ 5 pending chores  │   │
│ Local demo         │  │ Take out trash ...      │      │ 2 open expenses   │   │
│ Saved on browser   │  └─────────────────────────┘      └───────────────────┘   │
└────────────────────┴──────────────────────────────────────────────────────────┘
```

Sidebar content order: brand and collapse control in an aligned header, read-only household context, Workspace links (Dashboard, Chores, Expenses, Agreements), then Settings/About utilities and a compact local-only note in the footer. The collapsed rail keeps its own expand control and centered icons with tooltips; do not place desktop collapse/expand controls in the content header. Mobile uses a menu trigger in the content header and a close control in the Sheet header. Active page has a pale blue tint and a narrow left accent or colored text (not both aggressively). Use Lucide icons for navigation.

Profile switcher lives in the top bar: avatar + name + chevron. Dropdown lists all **active** roommates and includes a small explanation `Switch demo perspective`. It must never look like secure sign-in.

### Tablet (640–1023 px)

Collapse sidebar to narrow icon rail (optional) or an accessible slide-over menu. Preserve title, breadcrumbs and switcher. Content grid may become 2 columns or stacked depending on available width.

### Phone (<640 px)

Prefer a top bar with compact RoomieOS mark, current roommate switcher, and accessible navigation trigger. Navigation may be a drawer or compact bottom navigation; choose whichever is easier to implement reliably. Cards stack into one column. Forms open as full-width sheets or generous dialogs. **Never let the whole page overflow horizontally.**

## 5. Screen-by-screen specification

### 5.1 Welcome / initial setup

A centered, focused layout (not an elaborate marketing landing page): wordmark, tagline, single line explaining that this is a local demo, and two distinct option cards:

- **Explore a sample household** — recommended, preloaded realistic data.
- **Start from scratch** — household name, currency, and 2–20 roommate names with icon selectors.

Primary action: `Continue with sample` or `Create my household` as selected. Indicate that data stays in this browser, and that no sign-in is needed. Empty setup should never ask the user to create a backend account.

### 5.2 Dashboard

Structure:
1. House icon + editable household name heading (editing accessible through Settings), small helper line.
2. Three summary cards on desktop: **My pending chores**, **My balance**, **Open household expenses** (counts/amounts derived from app state).
3. Two-column section: **My upcoming chores** (title, due date, status) + **Household at a glance** (pending/completed counts and optional quick link to agreements).
4. One contextual call to action (e.g. `Add a chore`) with no competing button cluster.

Keep numbers defensible and labels precise: outstanding expense total is different from total net balances. Prefer open-expense **count** rather than a misleading 'total debt' if unclear. Personal net: `You are owed CAD 12.50` or `You owe CAD 12.50`; show `All settled` when zero.

### 5.3 Chores

Header: `Chores` / short description / right-aligned `+ New chore` button.

Chores is board-only, with no List/Board switcher or status/roommate filters (user-approved 24 November 2026). Show only chores assigned to the selected demo roommate, across all three statuses; update the count/cards immediately when perspective changes. Show a personal empty state when no chores are assigned, with a working Add a chore action.

**Card status:** show a non-interactive colored tag with icon/text; no per-card status dropdown. Click a title for detail actions, or use the card drag handle.

**Kanban board:** exactly three columns with compact headers and counts: `Pending`, `Completed`, `Skipped`. Cards show title, assignee avatar, due date, optional one-line notes. Click opens details; status action reachable without drag/drop. Approved UI-review enhancement (24 November 2026): cards can be dragged between columns using a handle or a non-interactive card surface with a mouse; touch uses the handle so the rest of the board remains scrollable. Highlight the destination column, support keyboard pickup/arrows/drop/Escape, and retain functional status actions inside the detail dialog. Keep ordering within a column unchanged.

**Create/edit modal or drawer fields:** Title (required), Assignee (active member picker), Due date (native date control), Notes (multiline, optional). Clearly label `Save` and `Cancel`. Form errors are inline.

Archived roommates’ chore history remains reachable from their roster entry in Settings, using the same detail/edit/rotation dialogs and safeguards.

**Details:** primary status action, `Rotate to next`, edit, delete. History panel shows `Completed by Avery • 22 Nov` in reverse chronological order. Rotation asks for the next due date and names the next assignee before confirmation.

**Status visuals:**
- Pending = neutral gray pill.
- Completed = gentle green pill with check icon.
- Skipped = amber neutral pill with skip icon.
- Overdue = small red `Overdue` label alongside **Pending** status; no red full-screen treatment.

### 5.4 Expenses

Header: `Expenses` / `Track shared spending without the spreadsheet.` / `+ Add expense`.

Top section: selected roommate's balance summary and a `Who owes whom` panel. Net amounts are red with a minus sign when owing, green without a plus sign when owed, and neutral at zero (user-approved 24 November 2026). Use direct sentences such as `You owe CAD 30.00 to Jordan` and `Jordan owes you CAD 15.00`. Name counterparties in the personal total; for multiple people, make clear that the amount is the total. Prioritize selected-roommate transfers, then show Other household balances. Retain explicit currency and avatars. If nobody owes anyone, show `All settled up`.

Below: a table/list of expenses with description, category, date, paid by (multiple payer avatars supported), total and `Open / Settled` label. Details shows the breakdown and actions to edit, settle/reopen or delete.

**Expense form layout:**
1. Basics: Description, amount, date, category, notes.
2. **Who paid?** One payer row initially; add payer; each row has roommate selector and contributed amount. Show `Allocated CAD 20.00 of CAD 45.00` and an inline discrepancy until balanced.
3. **Who shares this expense?** Multi-select roommate chips with avatars.
4. **Split it:** compact tabs `Equally / By % / By amount`. Show appropriate controls; user can see per-person calculated shares before saving. Guard against totals not matching.
5. Footer: `Cancel` / `Save expense`.

In details, make the formula transparent: list each payer contribution and each participant share. This prevents the simplified net balances from seeming arbitrary.

**Settlement action:** `Mark as settled` with modal: `This confirms the full expense was resolved outside RoomieOS. It will no longer count toward outstanding balances.` Show `Reopen expense` for settled records. No pretend payment button.

### 5.5 Agreements

A tidy document-like page; no large dashboard widgets. `House agreements` heading, optional explanatory sentence, `+ New agreement`. Display agreements as an elegant vertical list of titled entries with description and ellipsis menu for Edit/Delete. Empty state suggests an example such as quiet hours without auto-creating it.

### 5.6 Settings

Sections divided by whitespace and hairlines, not giant cards:
- **Household:** editable name and selected currency; explain currency locked once expenses exist.
- **Roommates:** vertical list with avatar, name, Edit and Remove (archive), plus `Add roommate`; separate small archived-member area with Restore where applicable. Explain why deletion may be blocked.
- **Prototype data:** note `Stored on this browser only`; `Reset demo` and `Start over` (both confirmation dialogs, with destructive wording). Do not expose opaque localStorage/debug details to ordinary users.

## 6. Components and reusable patterns

- `AppShell`: navigation, sidebar/drawer, top bar.
- `PageHeader`: title, subtitle, primary action.
- `MemberAvatar`: icon / initials / local photo with consistent circle geometry; use accessible alt text.
- `MemberPicker`: select active roommate with avatar.
- `StatusPill`: reusable statuses with text and icon.
- `EmptyState`: simple title, supporting sentence, one action.
- `ConfirmDialog`: destructive/settlement confirmation; escape, focus, keyboard handling.
- `FormField`: label, help text, error, control.
- `InlineNotice`: a clear and calm explanation for constraints (e.g. currency locked).
- `DataTable` or table-like layout: only as complex as needed; mobile cards.
- `Modal/Sheet`: focused editing flow with clear save/cancel, not full-screen arbitrary complexity.

**Interaction details:**
- Hover: subtle gray; active: pale accent.
- Loading: only where actual waiting exists; localStorage actions are immediate.
- Saving: close modal and show toast like `Chore saved`; don't show fake spinners.
- Destructive: always confirm, explain consequences, avoid accidentally deleting data.
- Form errors: show beside fields; preserve typed values and focus first invalid field on attempted save.
- Date: human-readable display (e.g. `Tue, Nov 24`) but store ISO date and compare local dates correctly.
- Balance: tabular numerals; consistent currency code; never use color alone to indicate owed/owing.

## 7. Empty, error, and edge states

Examples of exact content to use or adapt:

| Context | Header | Supporting text / action |
|---|---|---|
| No chores | `Nothing on the chore board` | `Add your first chore to get started.` / `Add a chore` |
| No expenses | `No shared expenses yet` | `Record a purchase to see how costs are split.` / `Add expense` |
| No balances due | `All settled up` | `There are no outstanding amounts across open expenses.` |
| No agreements | `Set the ground rules` | `Add a few house agreements to keep expectations clear.` |
| Invalid payer total | `Contributions don't add up` | `Payers must contribute exactly the full expense amount.` |
| Invalid split | `Shares don't add up` | `Adjust the split so everyone’s shares total the expense.` |
| Can't archive member | `Resolve this roommate's items first` | `Reassign pending chores and settle their open expenses before removing them.` |
| Locked currency | `Currency can't be changed yet` | `Remove existing expenses before changing the household currency.` |
| Storage failure | `Couldn't save changes` | `Your browser storage may be full. Try using an icon avatar instead of a photo.` |
| Invalid stored data | `Saved data couldn't be opened` | `You can start again, but resetting will erase this browser's RoomieOS data.` |

## 8. Accessibility and responsiveness

- Use semantic landmarks (`nav`, `main`, headings, forms, actual `button` elements).
- All icon-only buttons have accessible labels and visible tooltips where useful.
- Visible focus ring (~2 px) with adequate contrast; keyboard navigation works throughout.
- Dialogs use accessible focus management and restore focus after close; Escape dismisses non-critical dialogs.
- Buttons and form controls at least 44 px on touch when practical; avoid tiny Kanban-only drag handles.
- Inputs and state changes have readable text and errors; never rely solely on colored badges.
- At 375 px: one-column dashboard, card-form expense list, scroll-contained Kanban board, nav reachable, dialogs fit viewport.
- At 768 px: sensible two-column layout where space permits.
- At 1280 px: generous whitespace, sidebar, content constrained in width.
- Honor reduced-motion setting. Use transitions 120–180ms for hover and overlays only if they improve clarity.

## 9. Implementation guidance for Codex

1. Implement this design using **Tailwind utility classes and a small shared token stylesheet**. Avoid a separate design system package unless truly beneficial.
2. Start with app shell, page headings, buttons, avatars, text fields and dialogs; reuse them everywhere.
3. Icons: **lucide-react** is permitted. For local avatar pictures, keep image processing minimal and degrade gracefully to icon/initials.
4. Use local shadcn/ui components with Base UI for shared controls, menus, dialogs and navigation. Retain native date inputs for this first refresh; do not reinvent complex interactions.
5. No need for charts, gradients, externally sourced stock imagery or a dark-mode toggle.
6. Do not hardcode dashboard figures. Render from real state and shared selector functions.
7. On expenses, show integer-cent-accurate values. Display breakdowns before the user commits an expense.
8. Build polished states for **sample data and empty mode**. Neither should look unfinished.
9. Use textual button names from this specification when sensible; keep wording consistent across pages.
10. If a design detail conflicts with `PRD.md`, the **product and data behavior in PRD takes priority**. Ask only if neither document resolves it.

## 10. Design completion checklist

- [ ] Clean Notion-inspired but original RoomieOS visual identity.
- [ ] Desktop sidebar and sensible accessible mobile navigation.
- [ ] Shared page headers, typography and tokenized colors.
- [ ] Attractive but restrained sample dashboard, and equally thoughtful empty dashboard.
- [ ] Kanban status tags, drag moves and detail status actions are consistent.
- [ ] Expense amounts and breakdowns are easy to understand.
- [ ] Every form has labels, validation and clear save/cancel controls.
- [ ] Roommate avatars work with initials/icons and optional local thumbnails.
- [ ] Clear status colors plus text; proper focus/keyboard handling.
- [ ] No dead buttons, decorative fake data, random placeholder text or broken mobile layout.
