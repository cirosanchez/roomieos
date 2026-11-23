"use client";

import { useState, type FormEvent } from "react";
import {
  House,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { InlineNotice } from "@/components/ui/inline-notice";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { Wordmark } from "@/components/wordmark";
import {
  AvatarField,
  CurrencyField,
  focusInvalid,
} from "@/features/household/fields";
import { setupSchema } from "@/domain/validation";
import {
  MAX_ACTIVE_MEMBERS,
  MIN_ACTIVE_MEMBERS,
} from "@/domain/household-options";
import type { Currency } from "@/domain/types";
import type { MemberDraft } from "@/domain/household";
import { useHousehold } from "@/state/household-provider";

const newMember = (): MemberDraft => ({
  name: "",
  avatar: { kind: "initials", value: "" },
});

export function WelcomeScreen() {
  const { store, error, conflict } = useHousehold();
  const [mode, setMode] = useState<"sample" | "empty" | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [members, setMembers] = useState([newMember(), newMember()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function clearFieldError(key: string) {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }
  const updateMember = (index: number, change: Partial<MemberDraft>) => {
    if (change.name !== undefined) clearFieldError(`members.${index}.name`);
    setMembers((rows) =>
      rows.map((member, i) =>
        i === index ? { ...member, ...change } : member,
      ),
    );
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;
    store.dismissFeedback();
    if (mode === "sample") {
      store.sample(currency);
      return;
    }
    const input = {
      name: name.trim(),
      currency,
      members: members.map((member) => ({
        ...member,
        name: member.name.trim(),
      })),
    };
    const result = setupSchema.safeParse(input);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            issue.path.join("."),
            issue.path[0] === "name"
              ? "Enter a household name (1–60 characters)."
              : "Enter a roommate name (1–40 characters).",
          ]),
        ),
      );
      focusInvalid(event.currentTarget);
      return;
    }
    setErrors({});
    store.setup(result.data);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-8 sm:py-16">
      <div className="mb-10 self-start">
        <Wordmark />
      </div>
      <header>
        <span className="mb-5 flex size-12 items-center justify-center rounded-[10px] bg-subtle text-muted">
          <House aria-hidden="true" className="size-6" />
        </span>
        <h1 className="text-[30px] font-bold leading-tight tracking-tight sm:text-4xl">
          Your shared home, organized.
        </h1>
        <p className="mt-4 max-w-lg text-base text-muted">
          A little less household admin. A little more room to live.
        </p>
      </header>
      <form noValidate onSubmit={submit} className="mt-8 space-y-6">
        <fieldset>
          <legend className="mb-4 text-sm font-medium">
            How would you like to begin?
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                value: "sample" as const,
                title: "Explore a sample household",
                text: "Meet Maple House: three roommates, everyday chores and shared purchases.",
                Icon: Sparkles,
              },
              {
                value: "empty" as const,
                title: "Start from scratch",
                text: "Choose your household details and begin with a clean slate.",
                Icon: UsersRound,
              },
            ].map(({ value, title, text, Icon }) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-5 ${mode === value ? "border-accent bg-selected" : "border-line hover:bg-subtle"}`}
              >
                <input
                  type="radio"
                  name="starter-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setErrors({});
                    store.dismissFeedback();
                  }}
                  className="mt-1 size-4 shrink-0 accent-accent"
                />
                <span>
                  <Icon
                    aria-hidden="true"
                    className="mb-3 size-5 text-accent"
                  />
                  <span className="block text-base font-semibold">{title}</span>
                  <span className="mt-2 block text-sm text-muted">{text}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {mode && (
          <div className="space-y-6 border-t border-line pt-6">
            <div className="grid gap-5 sm:grid-cols-2">
              {mode === "empty" && (
                <FormField
                  id="household-name"
                  label="Household name"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearFieldError("name");
                  }}
                  error={errors.name}
                  placeholder="e.g. Cedar House"
                />
              )}
              <CurrencyField value={currency} onChange={setCurrency} />
            </div>
            {mode === "empty" && (
              <fieldset className="space-y-4">
                <legend className="mb-3 text-base font-semibold">
                  Your roommates
                </legend>
                <p className="text-sm text-muted">
                  Add {MIN_ACTIVE_MEMBERS}–{MAX_ACTIVE_MEMBERS} roommates. Names
                  and avatars can be changed later.
                </p>
                {members.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-[10px] border border-line p-4"
                  >
                    <div className="hidden pt-8 sm:block">
                      <MemberAvatar
                        name={member.name}
                        icon={
                          member.avatar.kind === "icon"
                            ? member.avatar.value
                            : undefined
                        }
                      />
                    </div>
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_120px]">
                      <FormField
                        id={`roommate-${index}-name`}
                        label={`Roommate ${index + 1} name`}
                        required
                        maxLength={40}
                        value={member.name}
                        onChange={(event) =>
                          updateMember(index, { name: event.target.value })
                        }
                        error={errors[`members.${index}.name`]}
                      />
                      <AvatarField
                        id={`roommate-${index}-avatar`}
                        label={`Roommate ${index + 1} avatar`}
                        avatar={member.avatar}
                        onChange={(avatar) => updateMember(index, { avatar })}
                      />
                    </div>
                    {members.length > MIN_ACTIVE_MEMBERS && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mt-7"
                        aria-label={`Remove roommate ${index + 1}`}
                        onClick={() => {
                          setMembers((rows) =>
                            rows.filter((_, i) => i !== index),
                          );
                          setErrors({});
                        }}
                      >
                        <X aria-hidden="true" className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {members.length < MAX_ACTIVE_MEMBERS && (
                  <Button
                    variant="secondary"
                    onClick={() => setMembers((rows) => [...rows, newMember()])}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Add roommate
                  </Button>
                )}
              </fieldset>
            )}
            {error && <InlineNotice tone="error">{error}</InlineNotice>}
            <Button type="submit" disabled={conflict}>
              {mode === "sample"
                ? "Continue with sample"
                : "Create my household"}
            </Button>
          </div>
        )}
      </form>
      <p className="mt-8 flex items-start gap-2 text-sm text-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Saved on this browser only. No sign-in or cross-device synchronization.
        Switching roommates changes the local demo perspective.
      </p>
    </main>
  );
}
