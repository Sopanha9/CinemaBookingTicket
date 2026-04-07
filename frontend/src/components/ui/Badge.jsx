import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-primary/40 bg-primary/20 text-primary",
        secondary: "border-secondary/50 bg-secondary/20 text-secondary",
        accent: "border-accent/50 bg-accent/20 text-accent",
        outline: "border-base-300 bg-transparent text-base-content",
        destructive: "border-error/40 bg-error/20 text-error",
      },
      size: {
        sm: "px-2 py-0 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export function Badge({ className, variant, size, children, ...props }) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { badgeVariants };
