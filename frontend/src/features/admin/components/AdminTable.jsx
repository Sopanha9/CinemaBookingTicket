import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/Table";

export default function AdminTable({
  columns,
  data,
  onEdit,
  onDelete,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" variant="shimmer" />
        <Skeleton className="h-10 w-full" variant="shimmer" />
        <Skeleton className="h-10 w-full" variant="shimmer" />
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 bg-base-200/50 p-8 text-center">
        <p className="text-sm text-base-content/70">No records found</p>
        <p className="mt-1 text-xs text-base-content/60">
          Create your first record to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          {(onEdit || onDelete) && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            {columns.map((column) => (
              <TableCell key={`${row.id}-${column.key}`}>
                {typeof column.render === "function"
                  ? column.render(row)
                  : row[column.key]}
              </TableCell>
            ))}
            {(onEdit || onDelete) && (
              <TableCell>
                <div className="flex items-center gap-2">
                  {onEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(row)}
                    >
                      ✎ Edit
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(row)}
                    >
                      🗑 Delete
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
