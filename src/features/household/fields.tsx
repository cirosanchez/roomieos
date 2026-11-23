"use client";

import { SelectField } from "@/components/ui/select-field";
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
      onChange={(event) => onChange(event.target.value as Currency)}
    >
      {currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </SelectField>
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
      onChange={(event) =>
        onChange(
          event.target.value === "initials"
            ? { kind: "initials", value: "" }
            : { kind: "icon", value: event.target.value },
        )
      }
    >
      <option value="initials">Initials</option>
      {avatarGroups.map((group) => (
        <optgroup key={group} label={group}>
          {avatarOptions
            .filter((option) => option.group === group)
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} {option.name}
              </option>
            ))}
        </optgroup>
      ))}
    </SelectField>
  );
}

export function focusInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() =>
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
  );
}
