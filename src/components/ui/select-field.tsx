import { ChevronDown } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { controlStyles } from "./form-field";

export function SelectField({
  id,
  label,
  help,
  error,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          id={id}
          className={`${controlStyles} appearance-none pr-10`}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={
            [
              help && `${id}-help`,
              error && `${id}-error`,
              props["aria-describedby"],
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        />
      </div>
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
