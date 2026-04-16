import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { getTopMoviesReport } from "../features/admin/reportsApi";

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const getRankAccent = (rank) => {
  if (rank === 1) return "border-l-4 border-yellow-400";
  if (rank === 2) return "border-l-4 border-zinc-300";
  if (rank === 3) return "border-l-4 border-amber-700";
  return "";
};

export default function TopMoviesPage() {
  const [limit, setLimit] = useState(10);

  const query = useQuery({
    queryKey: ["report-top-movies", { limit }],
    queryFn: () => getTopMoviesReport({ limit }),
  });

  const rows = useMemo(() => query.data?.rows || [], [query.data?.rows]);

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Movies</CardTitle>
          <div className="w-40">
            <Select
              value={String(limit)}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {query.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" variant="shimmer" />
              <Skeleton className="h-10 w-full" variant="shimmer" />
              <Skeleton className="h-10 w-full" variant="shimmer" />
            </div>
          ) : null}

          {query.isError ? (
            <Card className="border-error/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-error">
                    Failed to load top movies report.
                  </p>
                  <Button type="button" onClick={() => query.refetch()}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!query.isPending && !query.isError && rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-base-content/70">
              No movie ranking data available.
            </div>
          ) : null}

          {!query.isPending && !query.isError && rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Movie</TableHead>
                  <TableHead>Paid Revenue</TableHead>
                  <TableHead>Booking Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const rank = index + 1;
                  return (
                    <TableRow key={row.movieId} className={getRankAccent(rank)}>
                      <TableCell>#{rank}</TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{formatCurrency(row.paidRevenue)}</TableCell>
                      <TableCell>{row.bookingCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
