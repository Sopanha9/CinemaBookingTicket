import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import { cleanupExpiredLocks } from "../features/admin/reportsApi";
import { toastError, toastSuccess } from "../lib/toast";

export default function OperationsPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const mutation = useMutation({
    mutationFn: cleanupExpiredLocks,
    onSuccess: (result) => {
      const locksRemoved = result?.locksRemoved ?? result?.deletedCount ?? 0;
      toastSuccess(
        `Cleanup complete — ${locksRemoved} expired lock(s) removed`,
      );
      setLastRun(new Date());
      setConfirmOpen(false);
    },
    onError: (err) => {
      toastError(err?.message || "Cleanup failed", err?.requestId);
    },
  });

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Cleanup Expired Locks</CardTitle>
          <CardDescription>
            Removes all seat locks that have expired. Run this manually if users
            are reporting seats stuck in a locked state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" onClick={() => setConfirmOpen(true)}>
            Run Cleanup
          </Button>
          {lastRun ? (
            <p className="text-xs text-base-content/70">
              Last run: {lastRun.toLocaleString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              This will remove all expired seat locks. Continue?
            </DialogTitle>
            <DialogDescription>
              This action is safe and only affects expired lock records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Running..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
