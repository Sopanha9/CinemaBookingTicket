import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import {
  getShowtimePricing,
  getShowtimeSeats,
} from "../features/showtimes/api";
import { createLock } from "../features/booking/api";
import { useBookingStore } from "../features/booking/bookingStore";
import { toastConflict, toastError } from "../lib/toast";

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const formatStartTime = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Invalid time"
    : date.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const statusStyle = {
  available:
    "border-primary/50 bg-primary/15 text-primary hover:border-primary hover:bg-primary/25",
  locked: "cursor-not-allowed border-warning/60 bg-warning/20 text-warning",
  booked: "cursor-not-allowed border-error/60 bg-error/20 text-error",
};

export default function ShowtimeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initializedShowtimeRef = useRef(null);
  const selectedSeatIds = useBookingStore((state) => state.selectedSeatIds);
  const lockMinutes = useBookingStore((state) => state.lockMinutes);
  const toggleSeat = useBookingStore((state) => state.toggleSeat);
  const initSelection = useBookingStore((state) => state.initSelection);
  const setLock = useBookingStore((state) => state.setLock);

  const seatsQuery = useQuery({
    queryKey: ["showtime-seats", id],
    queryFn: () => getShowtimeSeats(id),
    enabled: Boolean(id),
  });

  const pricingQuery = useQuery({
    queryKey: ["showtime-pricing", id],
    queryFn: () => getShowtimePricing(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (seatsQuery.isError) {
      toastError(
        seatsQuery.error?.message || "Failed to load seats",
        seatsQuery.error?.requestId,
      );
    }
  }, [seatsQuery.error, seatsQuery.isError]);

  useEffect(() => {
    if (pricingQuery.isError) {
      toastError(
        pricingQuery.error?.message || "Failed to load pricing",
        pricingQuery.error?.requestId,
      );
    }
  }, [pricingQuery.error, pricingQuery.isError]);

  const isLoading = seatsQuery.isPending || pricingQuery.isPending;
  const hasError = seatsQuery.isError || pricingQuery.isError;
  const isForbidden =
    seatsQuery.error?.status === 403 || pricingQuery.error?.status === 403;

  const seatData = seatsQuery.data;
  const pricingData = pricingQuery.data;

  const seats = Array.isArray(seatData?.seats) ? seatData.seats : [];

  const groupedSeats = useMemo(() => {
    const map = new Map();

    for (const seat of seats) {
      const rowKey = String(seat?.rowNumber ?? "?");
      if (!map.has(rowKey)) {
        map.set(rowKey, []);
      }
      map.get(rowKey).push(seat);
    }

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [seats]);

  const seatPriceById = useMemo(() => {
    const map = {};
    for (const seat of seats) {
      map[seat.id] = Number(seat.price || 0);
    }
    return map;
  }, [seats]);

  useEffect(() => {
    if (id && seats.length > 0 && initializedShowtimeRef.current !== id) {
      initSelection(id, seatPriceById);
      initializedShowtimeRef.current = id;
    }
  }, [id, initSelection, seatPriceById, seats.length]);

  const total = useMemo(() => {
    return selectedSeatIds.reduce(
      (sum, seatId) => sum + (seatPriceById[seatId] || 0),
      0,
    );
  }, [seatPriceById, selectedSeatIds]);

  const lockMutation = useMutation({
    mutationFn: ({ showtimeId, seatIds, lockMinutes }) =>
      createLock({ showtimeId, seatIds, lockMinutes }),
  });

  const handleToggleSeat = (seat) => {
    if (seat.availability !== "available") {
      return;
    }

    toggleSeat(seat.id);
  };

  const handleSelectSeats = async () => {
    if (!id || selectedSeatIds.length === 0) {
      return;
    }

    try {
      const lockData = await lockMutation.mutateAsync({
        showtimeId: id,
        seatIds: selectedSeatIds,
        lockMinutes,
      });

      const expiresAt = lockData?.expiresAt || lockData?.lockedUntil;
      if (expiresAt) {
        setLock(new Date(expiresAt));
      }

      navigate("/bookings/confirm");
    } catch (err) {
      if (err?.status === 409) {
        toastConflict(
          "Some seats were just taken — please reselect",
          err?.requestId,
        );
        seatsQuery.refetch();
        return;
      }

      toastError(
        err?.message || "Failed to lock selected seats",
        err?.requestId,
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" variant="shimmer" />
        <Skeleton className="h-24 w-full" variant="shimmer" />
        <Skeleton className="h-72 w-full" variant="shimmer" />
      </div>
    );
  }

  if (hasError) {
    return (
      <Card className="border-error/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-error">
              {isForbidden
                ? "You don't have permission to view this."
                : "Failed to load showtime details. Please try again."}
            </p>
            <Button
              type="button"
              onClick={() => {
                seatsQuery.refetch();
                pricingQuery.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const showtime = seatData?.showtime;
  const summary = seatData?.summary || {};
  const dayType = pricingData?.dayType || summary?.dayType;
  const pricingRows =
    pricingData?.pricing || pricingData?.seatTypePricing || [];

  return (
    <section className="space-y-5 pb-28">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-base-content">
          {showtime?.movie?.title || "Showtime"}
        </h1>
        <p className="text-sm text-base-content/70">
          {showtime?.screen?.theater?.name || "Theater"} ·{" "}
          {showtime?.screen?.name || "Screen"} ·{" "}
          {formatStartTime(showtime?.startTime)}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          Available: {summary.availableSeats ?? 0}
        </Badge>
        <Badge variant="accent">Locked: {summary.lockedSeats ?? 0}</Badge>
        <Badge variant="destructive">Booked: {summary.bookedSeats ?? 0}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seat Map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedSeats.map(([row, rowSeats]) => (
            <div key={row} className="flex flex-wrap items-center gap-2">
              <span className="w-8 text-xs font-semibold text-base-content/60">
                {row}
              </span>
              <div className="flex flex-wrap gap-2">
                {rowSeats.map((seat) => {
                  const selected = selectedSeatIds.includes(seat.id);
                  const availability = seat.availability || "locked";
                  const seatLabel = `${seat.rowNumber}-${seat.columnNumber}`;
                  const availabilityLabel =
                    availability === "available"
                      ? "Available"
                      : availability === "locked"
                        ? "Locked"
                        : "Booked";
                  const seatTypeLabel =
                    typeof seat.seatType === "string" &&
                    seat.seatType.length > 0
                      ? `${seat.seatType.charAt(0).toUpperCase()}${seat.seatType.slice(1)}`
                      : "Standard";

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={availability !== "available"}
                      onClick={() => handleToggleSeat(seat)}
                      title={`${seatLabel} ${availability}`}
                      aria-label={`Row ${seat.rowNumber} Seat ${seat.columnNumber} - ${seatTypeLabel} - ${availabilityLabel}`}
                      className={[
                        "min-w-14 rounded-lg border px-2 py-2 text-xs font-semibold transition",
                        statusStyle[availability],
                        selected
                          ? "ring-2 ring-secondary ring-offset-1 ring-offset-base-100"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {seatLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pricing</CardTitle>
          <Badge>{dayType || "day type"}</Badge>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {pricingRows.map((entry) => (
              <li
                key={entry.seatType}
                className="flex items-center justify-between rounded-lg border border-base-300 bg-base-200 px-3 py-2"
              >
                <span className="capitalize">{entry.seatType}</span>
                <span className="font-semibold text-secondary">
                  {formatCurrency(entry.price)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-base-content">
            {selectedSeatIds.length} seats selected · Total:{" "}
            {formatCurrency(total)}
          </p>
          <Button
            type="button"
            disabled={selectedSeatIds.length === 0 || lockMutation.isPending}
            onClick={handleSelectSeats}
          >
            {lockMutation.isPending ? "Locking seats..." : "Select Seats"}
          </Button>
        </div>
      </div>
    </section>
  );
}
