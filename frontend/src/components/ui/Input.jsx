import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const inputVariants = cva(
  "w-full rounded-lg border bg-base-100 text-base-content placeholder:text-base-content/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-base-300",
        subtle: "border-base-300/60 bg-base-200",
        error: "border-error focus-visible:ring-error/60",
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

export function Input({ className, variant, size, children, ...props }) {
  const inputElement = (
    <input
      className={cn(inputVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!children) return inputElement;

  return (
    <div className="flex items-center gap-2">
      {inputElement}
      {children}
    </div>
  );
}

export { inputVariants };
