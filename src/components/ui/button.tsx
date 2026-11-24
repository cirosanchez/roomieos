import type { ComponentProps } from "react";
import { Button as Primitive, buttonVariants } from "./primitives/button";
import { cn } from "@/lib/utils";
type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
} as const;
export function buttonStyles(
  variant: Variant = "primary",
  className = "",
  size: "default" | "icon" = "default",
) {
  return cn(
    buttonVariants({ variant: variants[variant], size }),
    "min-h-11 gap-2 rounded-lg",
    size === "icon" ? "size-11" : "h-auto px-4 py-2.5",
    variant === "danger" && "bg-danger text-white hover:bg-danger/90",
    className,
  );
}
export function Button({
  variant = "primary",
  size = "default",
  className,
  type = "button",
  ...props
}: Omit<ComponentProps<typeof Primitive>, "variant" | "size" | "className"> & {
  className?: string;
  variant?: Variant;
  size?: "default" | "icon";
}) {
  return (
    <Primitive
      type={type}
      variant={variants[variant]}
      size={size}
      className={buttonStyles(variant, className, size)}
      {...props}
    />
  );
}
