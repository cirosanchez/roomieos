"use client";

import { SelectField, selectOptions } from "@/components/ui/select-field";
import { currencies } from "@/domain/validation";
import { avatarGroups, avatarOptions } from "@/domain/household-options";
import type { Currency, Member } from "@/domain/types";

export function CurrencyField({
  value,
  onChange,
  disabled = false,
  id = "currency",
}: {
  value: Currency;
  onChange: (value: Currency) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <SelectField
      id={id}
      label="Household currency"
      value={value}
      disabled={disabled}
      onValueChange={(value) => onChange(value as Currency)}
      options={selectOptions(
        currencies.map((currency) => ({
          value: currency,
          label: <>{currency}</>,
        })),
      )}
    />
  );
}

export function AvatarField({
  id,
  label = "Avatar",
  avatar,
  onChange,
}: {
  id: string;
  label?: string;
  avatar: Member["avatar"];
  onChange: (avatar: Member["avatar"]) => void;
}) {
  return (
    <SelectField
      id={id}
      label={label}
      value={avatar.kind === "icon" ? avatar.value : "initials"}
      onValueChange={(value) =>
        onChange(
          value === "initials"
            ? { kind: "initials", value: "" }
            : { kind: "icon", value: value },
        )
      }
      options={selectOptions(
        { value: "initials", label: <>Initials</> },
        avatarGroups.map((group) => [
          avatarOptions
            .filter((option) => option.group === group)
            .map((option) => ({
              value: option.value,
              label: (
                <>
                  {option.value} {option.name}
                </>
              ),
              group: group,
            })),
        ]),
      )}
    />
  );
}

export function focusInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() =>
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
  );
}
