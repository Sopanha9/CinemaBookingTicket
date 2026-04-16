import { useEffect, useRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const dialogOverlayVariants = cva(
  "fixed inset-0 z-50 flex items-center justify-center p-4",
  {
    variants: {
      variant: {
        default: "",
        accent: "",
        warning: "",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const dialogContentVariants = cva(
  "w-full rounded-lg border border-base-300 bg-base-100 text-base-content shadow-2xl",
  {
    variants: {
      variant: {
        default: "",
        accent: "border-accent/60",
        warning: "border-secondary/60",
      },
      size: {
        sm: "max-w-sm p-4",
        md: "max-w-lg p-6",
        lg: "max-w-2xl p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export function Dialog({
  open,
  onOpenChange,
  className,
  variant,
  size,
  children,
  ...props
}) {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousActiveElementRef.current = document.activeElement;
    const container = containerRef.current;
    if (!container) return undefined;

    const focusable = container.querySelectorAll(focusableSelector);
    const firstFocusable = focusable[0];
    if (firstFocusable) {
      firstFocusable.focus();
    } else {
      container.focus();
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange?.(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const nodes = Array.from(container.querySelectorAll(focusableSelector));
      if (nodes.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      const previous = previousActiveElementRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className={cn(dialogOverlayVariants({ variant, size }), className)}
      {...props}
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/70"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function DialogContent({
  className,
  variant,
  size,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        dialogContentVariants({ variant, size }),
        "relative",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ className, children, ...props }) {
  return (
    <div className={cn("mb-4 space-y-1", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <h2 className={cn("text-xl font-semibold", className)} {...props}>
      {children}
    </h2>
  );
}

export function DialogDescription({ className, children, ...props }) {
  return (
    <p className={cn("text-sm text-base-content/70", className)} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ className, children, ...props }) {
  return (
    <div
      className={cn("mt-6 flex items-center justify-end gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { dialogContentVariants, dialogOverlayVariants };
