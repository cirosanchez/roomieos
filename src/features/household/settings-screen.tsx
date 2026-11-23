"use client";

import { useState, type FormEvent } from "react";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { PageHeader } from "@/components/ui/page-header";
import {
  activeMembers,
  archiveBlockReason,
  type MemberDraft,
} from "@/domain/household";
import { householdDraftSchema, memberDraftSchema } from "@/domain/validation";
import { useReadyHousehold } from "@/state/household-provider";
import { AvatarField, CurrencyField, focusInvalid } from "./fields";
import type { AppState, Member } from "@/domain/types";
import { MAX_ACTIVE_MEMBERS } from "@/domain/household-options";

function HouseholdForm({ state }: { state: AppState }) {
  const { store, conflict } = useReadyHousehold();
  const [name, setName] = useState(state.household.name);
  const [currency, setCurrency] = useState(state.household.currency);
  const [nameError, setNameError] = useState<string>();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = householdDraftSchema.safeParse({
      name: name.trim(),
      currency,
    });
    if (!result.success) {
      setNameError("Enter a household name (1–60 characters).");
      focusInvalid(event.currentTarget);
      return;
    }
    setNameError(undefined);
    store.dispatch(
      { type: "update-household", ...result.data },
      "Household saved.",
    );
  }
  return (
    <section className="border-t border-line py-7">
      <h2 className="mb-5 text-lg font-semibold">Household</h2>
      <form noValidate onSubmit={submit} className="max-w-xl space-y-5">
        <FormField
          id="settings-household-name"
          label="Household name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
          required
          maxLength={60}
          error={nameError}
        />
        <CurrencyField
          value={currency}
          onChange={setCurrency}
          disabled={state.expenses.length > 0}
        />
        {state.expenses.length > 0 && (
          <p className="text-sm text-muted">
            Currency is locked while any expenses exist, including settled
            expenses. Remove all expenses before changing it.
          </p>
        )}
        <Button type="submit" disabled={conflict}>
          Save household
        </Button>
      </form>
    </section>
  );
}

function MemberEditor({
  member,
  onClose,
}: {
  member: Member | null;
  onClose: () => void;
}) {
  const { store, conflict } = useReadyHousehold();
  const [draft, setDraft] = useState<MemberDraft>(
    member
      ? { name: member.name, avatar: member.avatar }
      : { name: "", avatar: { kind: "initials", value: "" } },
  );
  const [nameError, setNameError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const title = member ? "Edit roommate" : "Add roommate";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = memberDraftSchema.safeParse({
      ...draft,
      name: draft.name.trim(),
    });
    if (!result.success) {
      setNameError("Enter a roommate name (1–40 characters).");
      focusInvalid(event.currentTarget);
      return;
    }
    setNameError(undefined);
    const saved = store.dispatch(
      member
        ? { type: "edit-member", id: member.id, member: result.data }
        : { type: "add-member", member: result.data },
      member ? "Roommate updated." : "Roommate added.",
    );
    if (saved.ok) onClose();
    else setSaveError(saved.error);
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description="This is a local demo profile, not a user account."
    >
      <form noValidate onSubmit={submit} className="space-y-5">
        <FormField
          id="member-name"
          label="Roommate name"
          value={draft.name}
          onChange={(event) => {
            setDraft({ ...draft, name: event.target.value });
            setNameError(undefined);
          }}
          required
          maxLength={40}
          error={nameError}
        />
        <AvatarField
          id="member-avatar"
          avatar={draft.avatar}
          onChange={(avatar) => setDraft({ ...draft, avatar })}
        />
        {saveError && <InlineNotice tone="error">{saveError}</InlineNotice>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={conflict}>
            {member ? "Save roommate" : "Add roommate"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SettingsScreen() {
  const { state, store, conflict } = useReadyHousehold();
  const [editor, setEditor] = useState<Member | "new" | null>(null);
  const [confirmation, setConfirmation] = useState<
    "reset" | "clear" | Member | null
  >(null);
  const [confirmError, setConfirmError] = useState<string>();
  const active = activeMembers(state);
  const archived = state.members
    .filter((member) => !member.active)
    .sort((a, b) => a.order - b.order);
  const openConfirmation = (value: typeof confirmation) => {
    store.dismissFeedback();
    setConfirmError(undefined);
    setConfirmation(value);
  };
  function confirm() {
    const result =
      confirmation === "reset"
        ? store.sample(state.household.currency, true)
        : confirmation === "clear"
          ? store.clear()
          : confirmation
            ? store.dispatch(
                { type: "archive-member", id: confirmation.id },
                "Roommate archived.",
              )
            : null;
    if (result?.ok) setConfirmation(null);
    else if (result) setConfirmError(result.error);
  }
  function rosterRow(member: Member) {
    const blocked = member.active
      ? archiveBlockReason(state, member.id)
      : active.length >= MAX_ACTIVE_MEMBERS
        ? `Archive another roommate first; the active limit is ${MAX_ACTIVE_MEMBERS}.`
        : null;
    return (
      <li
        key={member.id}
        className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-4 last:border-0"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <MemberAvatar
            name={member.name}
            icon={
              member.avatar.kind === "icon" ? member.avatar.value : undefined
            }
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">
              {member.name}
              {state.selectedMemberId === member.id && (
                <span className="ml-2 text-xs font-normal text-muted">
                  Current perspective
                </span>
              )}
            </p>
            {blocked && (
              <p
                id={`member-${member.id}-reason`}
                className="mt-1 max-w-md text-sm text-muted"
              >
                {blocked}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              store.dismissFeedback();
              setEditor(member);
            }}
          >
            Edit<span className="sr-only"> {member.name}</span>
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(blocked) || conflict}
            aria-describedby={
              blocked ? `member-${member.id}-reason` : undefined
            }
            onClick={() =>
              member.active
                ? openConfirmation(member)
                : store.dispatch(
                    { type: "restore-member", id: member.id },
                    "Roommate restored.",
                  )
            }
          >
            {member.active ? "Archive" : "Restore"}
            <span className="sr-only"> {member.name}</span>
          </Button>
        </div>
      </li>
    );
  }
  const title =
    confirmation === "reset"
      ? "Reset sample household?"
      : confirmation === "clear"
        ? "Start over?"
        : `Archive ${confirmation?.name ?? "roommate"}?`;
  const description =
    confirmation === "reset"
      ? `Replace all local changes with Maple House sample data in ${state.household.currency}. This cannot be undone.`
      : confirmation === "clear"
        ? "Erase this browser's household, chores, expenses and agreements and return to the first-run choice. This cannot be undone."
        : "Remove this roommate from active selections. Historical records and roster order will be kept, and the roommate can be restored later.";
  return (
    <>
      <PageHeader
        title="Settings"
        description="The details that make a household yours."
        icon={<Settings className="size-6" />}
      />
      <HouseholdForm
        key={`${state.household.name}:${state.household.currency}:${state.starterMode}`}
        state={state}
      />
      <section className="border-t border-line py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Roommates</h2>
            <p className="mt-1 text-sm text-muted">
              {active.length} of {MAX_ACTIVE_MEMBERS} active · At least two
              roommates are required.
            </p>
          </div>
          <Button
            variant="secondary"
            disabled={active.length >= MAX_ACTIVE_MEMBERS || conflict}
            onClick={() => {
              store.dismissFeedback();
              setEditor("new");
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            Add roommate
          </Button>
        </div>
        <ul className="mt-3" aria-label="Active roommates">
          {active.map(rosterRow)}
        </ul>
        {archived.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Archived roommates</h3>
            <p className="mt-1 text-sm text-muted">
              Their historical records and original roster order are preserved.
            </p>
            <ul aria-label="Archived roommates">{archived.map(rosterRow)}</ul>
          </div>
        )}
      </section>
      <section className="border-t border-line py-7">
        <h2 className="text-lg font-semibold">Prototype data</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Stored on this browser only. Switching roommates changes your demo
          perspective. It does not sign anyone in or share data with another
          device.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={conflict}
            onClick={() => openConfirmation("reset")}
          >
            Reset demo
          </Button>
          <Button
            variant="danger"
            disabled={conflict}
            onClick={() => openConfirmation("clear")}
          >
            Start over
          </Button>
        </div>
      </section>
      {editor && (
        <MemberEditor
          key={editor === "new" ? "new" : editor.id}
          member={editor === "new" ? null : editor}
          onClose={() => setEditor(null)}
        />
      )}
      <ConfirmDialog
        open={confirmation !== null}
        onClose={() => setConfirmation(null)}
        onConfirm={confirm}
        title={title}
        description={description}
        confirmLabel={
          confirmation === "reset"
            ? "Reset demo"
            : confirmation === "clear"
              ? "Erase household"
              : "Archive roommate"
        }
        destructive
        error={confirmError}
      />
    </>
  );
}
