import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const skeletonVariants = cva("animate-pulse rounded-lg bg-base-300/60", {
  variants: {
    variant: {
      default: "",
      shimmer:
        "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
    },
    size: {
      sm: "h-4 w-24",
      md: "h-6 w-full",
      lg: "h-10 w-full",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export function Skeleton({ className, variant, size, children, ...props }) {
  return (
    <div
      className={cn(skeletonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { skeletonVariants };
