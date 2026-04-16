import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import DateRangePicker from "../features/admin/components/DateRangePicker";
import { getBookingReport } from "../features/admin/reportsApi";

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const toDate = (date) => date.toISOString().slice(0, 10);
  return { from: toDate(start), to: toDate(end) };
};

const badgeVariant = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

export default function BookingReportPage() {
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [range, setRange] = useState(initialRange);
  const [status, setStatus] = useState("all");

  const query = useQuery({
    queryKey: ["report-bookings", { from: range.from, to: range.to, status }],
    queryFn: () => getBookingReport({ from: range.from, to: range.to, status }),
  });

  const byStatus = useMemo(() => {
    const rows = query.data?.byStatus || [];
    const map = { pending: 0, confirmed: 0, cancelled: 0 };
    for (const entry of rows) {
      map[entry.status] = entry.count;
    }
    return map;
  }, [query.data?.byStatus]);

  const isEmpty =
    !query.isPending &&
    !query.isError &&
    Number(query.data?.totalBookings || 0) === 0;

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Booking Volume Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={({ from, to }) => setRange({ from, to })}
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">all</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="cancelled">cancelled</option>
          </Select>
        </CardContent>
      </Card>

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Skeleton className="h-24 w-full" variant="shimmer" />
          <Skeleton className="h-24 w-full" variant="shimmer" />
          <Skeleton className="h-24 w-full" variant="shimmer" />
          <Skeleton className="h-24 w-full" variant="shimmer" />
        </div>
      ) : null}

      {query.isError ? (
        <Card className="border-error/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-error">
                Failed to load booking report.
              </p>
              <Button type="button" onClick={() => query.refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-base-content/70">
            No bookings found in this period.
          </CardContent>
        </Card>
      ) : null}

      {!query.isPending && !query.isError && !isEmpty ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-base-content/70">
                Total Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-primary">
              {query.data.totalBookings}
            </CardContent>
          </Card>

          {["pending", "confirmed", "cancelled"].map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-base-content/70">
                  <span className="capitalize">{key}</span>
                  <Badge variant={badgeVariant[key]}>{key}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {byStatus[key]}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
