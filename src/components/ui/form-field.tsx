import { Input } from "./primitives/input";
import { Label } from "./primitives/label";
import type { InputHTMLAttributes } from "react";

export const controlStyles =
  "w-full min-w-0 rounded-[7px] border border-control bg-page px-3 py-2.5 text-base text-ink aria-invalid:border-danger disabled:bg-subtle";

export function FormField({
  label,
  help,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
}) {
  const descriptions =
    [help && `${id}-help`, error && `${id}-error`, props["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="block break-words text-sm font-medium">
        {label}
        {props.required && <span className="text-muted"> (required)</span>}
      </Label>
      <Input
        {...props}
        id={id}
        className={`${controlStyles} ${props.className ?? ""}`}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={descriptions}
      />
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
