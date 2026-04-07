import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const separatorVariants = cva("shrink-0 bg-base-300", {
  variants: {
    variant: {
      default: "",
      primary: "bg-primary/40",
      secondary: "bg-secondary/50",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
    },
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    orientation: "horizontal",
  },
});

export function Separator({
  className,
  variant,
  size,
  children,
  orientation = "horizontal",
  ...props
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        separatorVariants({ variant, size, orientation }),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { separatorVariants };
