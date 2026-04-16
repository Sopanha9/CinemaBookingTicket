import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Skeleton } from "../components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { getBooking, updateBookingStatus } from "../features/booking/api";
import { getPayments } from "../features/payments/api";
import { toastError, toastSuccess } from "../lib/toast";

const statusBadgeVariant = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const query = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id),
    enabled: Boolean(id),
  });

  const bookingPaymentsQuery = useQuery({
    queryKey: ["booking-payments", id],
    queryFn: () => getPayments(id),
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      updateBookingStatus(id, {
        status: "cancelled",
        cancellationReason,
      }),
  });

  const booking = query.data;
  const isBookingForbidden = query.error?.status === 403;
  const isPaymentForbidden = bookingPaymentsQuery.error?.status === 403;
  const latestPayment = Array.isArray(bookingPaymentsQuery.data)
    ? bookingPaymentsQuery.data[0]
    : null;
  const canCancel =
    booking?.status === "pending" || booking?.status === "confirmed";

  const sortedSeats = useMemo(() => {
    const rows = Array.isArray(booking?.bookingSeats)
      ? booking.bookingSeats
      : [];

    return [...rows].sort((a, b) => {
      const aRow = String(a?.seat?.rowNumber || "");
      const bRow = String(b?.seat?.rowNumber || "");
      if (aRow !== bRow) {
        return aRow.localeCompare(bRow);
      }
      return (
        Number(a?.seat?.columnNumber || 0) - Number(b?.seat?.columnNumber || 0)
      );
    });
  }, [booking?.bookingSeats]);

  const handleCancelBooking = async () => {
    try {
      await cancelMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["booking", id] });
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setCancelDialogOpen(false);
      setCancellationReason("");
      toastSuccess("Booking cancelled");
    } catch (err) {
      toastError(err?.message || "Failed to cancel booking", err?.requestId);
    }
  };

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-72" variant="shimmer" />
        <Skeleton className="h-64 w-full" variant="shimmer" />
      </div>
    );
  }

  if (query.isError || !booking) {
    return (
      <Card className="border-error/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-error">
              {isBookingForbidden
                ? "You don't have permission to view this."
                : "Failed to load booking details."}
            </p>
            <Button type="button" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{booking?.showtime?.movie?.title || "Booking"}</CardTitle>
          <CardDescription>
            {booking?.showtime?.screen?.theater?.name || "Theater"} ·{" "}
            {booking?.showtime?.screen?.name || "Screen"} ·{" "}
            {formatDateTime(booking?.showtime?.startTime)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant={statusBadgeVariant[booking.status] || "outline"}>
            {booking.status}
          </Badge>
          <span className="text-sm text-base-content/70">
            Total: {formatCurrency(booking.totalAmount)}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seats</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSeats.map((bookingSeat) => (
                <TableRow key={bookingSeat.id}>
                  <TableCell>{bookingSeat?.seat?.rowNumber}</TableCell>
                  <TableCell>{bookingSeat?.seat?.columnNumber}</TableCell>
                  <TableCell className="capitalize">
                    {bookingSeat?.seat?.seatType}
                  </TableCell>
                  <TableCell>{formatCurrency(bookingSeat?.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>
            Track and manage payment status for this booking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingPaymentsQuery.isPending ? (
            <Skeleton className="h-10 w-full" variant="shimmer" />
          ) : null}

          {bookingPaymentsQuery.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-error/40 bg-error/10 p-3">
              <p className="text-sm text-error">
                {isPaymentForbidden
                  ? "You don't have permission to view this."
                  : "Failed to load payment status."}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => bookingPaymentsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {!bookingPaymentsQuery.isPending &&
          !bookingPaymentsQuery.isError &&
          !latestPayment ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-200 p-3">
              <p className="text-sm text-base-content/80">
                No payment found for this booking.
              </p>
              <Button
                type="button"
                onClick={() => navigate(`/bookings/${id}/pay`)}
              >
                Pay Now
              </Button>
            </div>
          ) : null}

          {!bookingPaymentsQuery.isPending &&
          !bookingPaymentsQuery.isError &&
          latestPayment?.status === "pending" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/15 p-3">
              <div>
                <Badge variant="secondary">Payment Pending</Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/bookings/${id}/pay`)}
              >
                View Payment
              </Button>
            </div>
          ) : null}

          {!bookingPaymentsQuery.isPending &&
          !bookingPaymentsQuery.isError &&
          latestPayment?.status === "paid" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-green-400/40 bg-green-500/15 p-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-green-400/50 bg-green-500/15 text-green-300"
                >
                  Paid
                </Badge>
                <span className="text-sm text-base-content/80">
                  Amount: {formatCurrency(latestPayment.amount)}
                </span>
              </div>
            </div>
          ) : null}

          {!bookingPaymentsQuery.isPending &&
          !bookingPaymentsQuery.isError &&
          latestPayment?.status === "failed" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-error/40 bg-error/10 p-3">
              <Badge variant="destructive">Payment Failed</Badge>
              <Button
                type="button"
                onClick={() => navigate(`/bookings/${id}/pay`)}
              >
                Retry Payment
              </Button>
            </div>
          ) : null}

          {!bookingPaymentsQuery.isPending &&
          !bookingPaymentsQuery.isError &&
          latestPayment?.status === "refunded" ? (
            <div className="rounded-lg border border-base-300 bg-base-200 p-3">
              <Badge variant="outline">Refunded</Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canCancel ? (
        <Card>
          <CardHeader>
            <CardTitle>Cancel Booking</CardTitle>
            <CardDescription>
              Cancel only if you are sure. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-start">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Booking
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      <Dialog open={isCancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Are you sure you want to cancel this booking?
            </DialogTitle>
            <DialogDescription>
              You can optionally provide a cancellation reason.
            </DialogDescription>
          </DialogHeader>

          <textarea
            value={cancellationReason}
            onChange={(event) => setCancellationReason(event.target.value)}
            rows={4}
            placeholder="Optional cancellation reason"
            className="w-full rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={handleCancelBooking}
            >
              {cancelMutation.isPending
                ? "Cancelling..."
                : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
