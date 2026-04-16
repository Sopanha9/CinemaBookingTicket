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
import { getOccupancyReport } from "../features/admin/reportsApi";

const getBarColorClass = (rate) => {
  if (rate > 70) return "bg-green-500";
  if (rate >= 40) return "bg-amber-500";
  return "bg-zinc-500";
};

export default function OccupancyReportPage() {
  const [limit, setLimit] = useState(20);

  const query = useQuery({
    queryKey: ["report-occupancy", { limit }],
    queryFn: () => getOccupancyReport({ limit }),
  });

  const rows = useMemo(() => query.data?.rows || [], [query.data?.rows]);

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Occupancy Report</CardTitle>
          <div className="w-40">
            <Select
              value={String(limit)}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
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
                    Failed to load occupancy report.
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
              No occupancy data available.
            </div>
          ) : null}

          {!query.isPending && !query.isError && rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Showtime</TableHead>
                  <TableHead>Movie</TableHead>
                  <TableHead>Screen</TableHead>
                  <TableHead>Total Seats</TableHead>
                  <TableHead>Booked Seats</TableHead>
                  <TableHead>Occupancy %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.showtimeId}>
                    <TableCell>
                      {new Date(row.startTime).toLocaleString()}
                    </TableCell>
                    <TableCell>{row.movieTitle}</TableCell>
                    <TableCell>{row.screenName}</TableCell>
                    <TableCell>{row.totalSeats}</TableCell>
                    <TableCell>{row.bookedSeats}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-xs">
                          {row.occupancyRate.toFixed(2)}%
                        </div>
                        <div className="h-2 w-32 rounded bg-base-300">
                          <div
                            className={`h-2 rounded ${getBarColorClass(row.occupancyRate)}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, row.occupancyRate))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
