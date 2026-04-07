import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva(
  "rounded-lg border border-base-300 bg-base-200 text-base-content shadow",
  {
    variants: {
      variant: {
        default: "",
        elevated: "shadow-xl",
        ghost: "bg-transparent shadow-none",
        accent: "border-accent/50 bg-accent/10",
      },
      size: {
        sm: "p-3",
        md: "p-5",
        lg: "p-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export function Card({ className, variant, size, children, ...props }) {
  return (
    <section
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <header className={cn("mb-3 space-y-1", className)} {...props}>
      {children}
    </header>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-base-content/70", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <footer
      className={cn("mt-4 flex items-center justify-end gap-2", className)}
      {...props}
    >
      {children}
    </footer>
  );
}

export { cardVariants };
