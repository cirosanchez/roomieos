import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
export function buttonStyles(
  variant: Variant = "primary",
  className = "",
  size: "default" | "icon" = "default",
) {
  const variants: Record<Variant, string> = {
    primary: "border-transparent bg-accent text-white hover:bg-accent-hover",
    secondary: "border-line-strong bg-page text-ink hover:bg-subtle",
    ghost: "border-transparent text-muted hover:bg-hover hover:text-ink",
    danger: "border-transparent bg-danger text-white hover:brightness-90",
  };
  const spacing = size === "icon" ? "size-11 shrink-0 p-0" : "px-4 py-2";
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${spacing} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "default" | "icon";
}) {
  return (
    <button
      type={type}
      className={buttonStyles(variant, className, size)}
      {...props}
    />
  );
}
