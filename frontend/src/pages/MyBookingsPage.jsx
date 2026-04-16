import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { getMyBookings } from "../features/booking/api";

const statusBadgeConfig = {
  pending: {
    variant: "secondary",
    className: "",
  },
  confirmed: {
    variant: "outline",
    className: "border-green-400/50 bg-green-500/15 text-green-300",
  },
  cancelled: {
    variant: "outline",
    className: "border-zinc-500/50 bg-zinc-500/20 text-zinc-200",
  },
};

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const formatDate = (value) => {
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

export default function MyBookingsPage() {
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ["my-bookings"],
    queryFn: getMyBookings,
  });

  const bookings = Array.isArray(query.data) ? query.data : [];

  if (query.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" variant="shimmer" />
        <Skeleton className="h-10 w-full" variant="shimmer" />
        <Skeleton className="h-10 w-full" variant="shimmer" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card className="border-error/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-error">Failed to load bookings.</p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3">
          <p className="text-sm text-base-content/70">
            You have no bookings yet.
          </p>
          <button
            type="button"
            onClick={() => navigate("/showtimes")}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Browse Showtimes
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Movie</TableHead>
              <TableHead>Showtime</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="cursor-pointer"
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                <TableCell>
                  {booking?.showtime?.movie?.title || "Unknown movie"}
                </TableCell>
                <TableCell>
                  {formatDate(booking?.showtime?.startTime)}
                </TableCell>
                <TableCell>{booking?.bookingSeats?.length || 0}</TableCell>
                <TableCell>{formatCurrency(booking?.totalAmount)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      statusBadgeConfig[booking.status]?.variant || "outline"
                    }
                    className={statusBadgeConfig[booking.status]?.className}
                  >
                    {booking.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
