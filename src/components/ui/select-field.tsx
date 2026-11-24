"use client";
import { isValidElement, type ReactNode } from "react";
import { Label } from "./primitives/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "./primitives/select";
export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  group?: string;
};
type OptionInput = SelectOption | false | null | undefined | OptionInput[];
export function selectOptions(...inputs: OptionInput[]): SelectOption[] {
  return inputs.flatMap((input) =>
    Array.isArray(input) ? selectOptions(...input) : input ? [input] : [],
  );
}
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return text(node.props.children);
  return "";
}
export function SelectField({
  id,
  label,
  help,
  error,
  options,
  value,
  onValueChange,
  disabled,
  required,
  name,
  className,
  "aria-label": ariaLabel,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const groups = Array.from(new Set(options.map((o) => o.group)));
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="block text-sm font-medium">
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onValueChange(v);
        }}
        disabled={disabled}
        required={required}
        name={name}
        items={options.map((o) => ({ value: o.value, label: text(o.label) }))}
      >
        <SelectTrigger
          data-value={value}
          id={id}
          aria-label={ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [help && `${id}-help`, error && `${id}-error`]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={`w-full min-w-0 ${className ?? ""}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          align="start"
          alignItemWithTrigger={false}
          className="max-h-72 max-w-[calc(100vw-2rem)]"
        >
          {groups.map((group, i) => (
            <SelectGroup key={group ?? i}>
              {group && <SelectLabel>{group}</SelectLabel>}
              {options
                .filter((o) => o.group === group)
                .map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    disabled={o.disabled}
                    data-value={o.value}
                  >
                    {o.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
