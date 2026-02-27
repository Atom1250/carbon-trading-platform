import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "destructive";

type Size = "default" | "sm" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
};

const styles: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  outline: "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild, ...props },
  ref
) {
  const sizeClass =
    size === "sm"
      ? "h-8 px-3 py-1.5 text-xs"
      : size === "lg"
        ? "h-11 px-5 py-2.5 text-base"
        : "h-10 px-4 py-2 text-sm";

  if (asChild && React.isValidElement(props.children)) {
    const child = props.children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        sizeClass,
        styles[variant],
        child.props.className,
        className
      ),
    });
  }

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        sizeClass,
        styles[variant],
        className
      )}
      {...props}
    />
  );
});
