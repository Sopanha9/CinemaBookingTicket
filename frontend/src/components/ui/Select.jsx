import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const selectVariants = cva(
  "w-full appearance-none rounded-lg border bg-base-100 text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-base-300",
        subtle: "border-base-300/60 bg-base-200",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-3 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export function Select({ className, variant, size, children, ...props }) {
  return (
    <div className="relative">
      <select
        className={cn(selectVariants({ variant, size }), "pr-10", className)}
        {...props}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base-content/60">
        ▾
      </span>
    </div>
  );
}

export { selectVariants };
