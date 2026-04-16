import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import DateRangePicker from "../features/admin/components/DateRangePicker";
import { getRevenueReport } from "../features/admin/reportsApi";

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const toDate = (date) => date.toISOString().slice(0, 10);
  return { from: toDate(start), to: toDate(end) };
};

export default function RevenueReportPage() {
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [range, setRange] = useState(initialRange);

  const query = useQuery({
    queryKey: ["report-revenue", { from: range.from, to: range.to }],
    queryFn: () => getRevenueReport({ from: range.from, to: range.to }),
  });

  const data = query.data;
  const isForbidden = query.error?.status === 403;
  const isEmpty =
    !query.isPending && !query.isError && Number(data?.paymentCount || 0) === 0;

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Revenue Report</CardTitle>
        </CardHeader>
        <CardContent>
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={({ from, to }) => setRange({ from, to })}
          />
        </CardContent>
      </Card>

      {query.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" variant="shimmer" />
          <Skeleton className="h-28 w-full" variant="shimmer" />
          <Skeleton className="h-28 w-full" variant="shimmer" />
        </div>
      ) : null}

      {query.isError ? (
        <Card className="border-error/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-error">
                {isForbidden
                  ? "You don't have permission to view this."
                  : "Failed to load revenue report."}
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
            No paid payments in this period.
          </CardContent>
        </Card>
      ) : null}

      {!query.isPending && !query.isError && !isEmpty ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-base-content/70">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-secondary">
              {formatCurrency(data?.totalRevenue)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-base-content/70">
                Average Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-base-content">
              {formatCurrency(data?.averagePaymentAmount)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-base-content/70">
                Paid Count
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-primary">
              {Number(data?.paymentCount || 0)}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
