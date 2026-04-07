import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const tableVariants = cva("w-full border-collapse text-left", {
  variants: {
    variant: {
      default: "",
      striped: "[&_tbody_tr:nth-child(odd)]:bg-base-200/70",
      bordered: "border border-base-300",
    },
    size: {
      sm: "text-xs",
      md: "text-sm",
      lg: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export function Table({ className, variant, size, children, ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-base-300 bg-base-100">
      <table
        className={cn(tableVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn("bg-base-200", className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn("border-b border-base-300 hover:bg-base-200/60", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }) {
  return (
    <th
      className={cn(
        "h-11 px-4 align-middle font-medium text-base-content/80",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)} {...props}>
      {children}
    </td>
  );
}

export function TableCaption({ className, children, ...props }) {
  return (
    <caption
      className={cn("mt-4 text-sm text-base-content/70", className)}
      {...props}
    >
      {children}
    </caption>
  );
}

export { tableVariants };
