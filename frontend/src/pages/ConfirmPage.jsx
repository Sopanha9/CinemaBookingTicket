import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
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
  createBooking,
  extendLock,
  releaseLock,
} from "../features/booking/api";
import { useBookingStore } from "../features/booking/bookingStore";
import { getShowtimeSeats } from "../features/showtimes/api";
import { toastConflict, toastError, toastSuccess } from "../lib/toast";

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

const formatRemaining = (ms) => {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const min = String(Math.floor(safe / 60)).padStart(2, "0");
  const sec = String(safe % 60).padStart(2, "0");
  return `${min}:${sec}`;
};

export default function ConfirmPage() {
  const navigate = useNavigate();

  const showtimeId = useBookingStore((state) => state.showtimeId);
  const selectedSeatIds = useBookingStore((state) => state.selectedSeatIds);
  const seatPrices = useBookingStore((state) => state.seatPrices);
  const lockExpiresAt = useBookingStore((state) => state.lockExpiresAt);
  const lockMinutes = useBookingStore((state) => state.lockMinutes);
  const setLock = useBookingStore((state) => state.setLock);
  const clearBooking = useBookingStore((state) => state.clearBooking);

  const selectedRef = useRef(selectedSeatIds);
  const showtimeRef = useRef(showtimeId);
  const hasConfirmedRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selectedSeatIds;
    showtimeRef.current = showtimeId;
  }, [selectedSeatIds, showtimeId]);

  const [remainingMs, setRemainingMs] = useState(() => {
    if (!lockExpiresAt) return 0;
    return Math.max(0, new Date(lockExpiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!lockExpiresAt) {
      setRemainingMs(0);
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingMs(
        Math.max(0, new Date(lockExpiresAt).getTime() - Date.now()),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockExpiresAt]);

  useEffect(() => {
    return () => {
      if (hasConfirmedRef.current) {
        return;
      }

      const currentShowtimeId = showtimeRef.current;
      if (!currentShowtimeId) {
        return;
      }

      void releaseLock({
        showtimeId: currentShowtimeId,
      });

      clearBooking();
    };
  }, [clearBooking]);

  const seatsQuery = useQuery({
    queryKey: ["showtime-seats", showtimeId],
    queryFn: () => getShowtimeSeats(showtimeId),
    enabled: Boolean(showtimeId),
  });

  const extendMutation = useMutation({
    mutationFn: () =>
      extendLock({
        showtimeId,
        seatIds: selectedSeatIds,
        lockMinutes,
      }),
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      createBooking({
        showtimeId,
        seatIds: selectedSeatIds,
      }),
  });

  const seats = useMemo(() => {
    const allSeats = seatsQuery.data?.seats || [];
    const selected = new Set(selectedSeatIds);
    return allSeats.filter((seat) => selected.has(seat.id));
  }, [seatsQuery.data?.seats, selectedSeatIds]);

  const total = useMemo(() => {
    return selectedSeatIds.reduce(
      (sum, seatId) => sum + (seatPrices?.[seatId] || 0),
      0,
    );
  }, [seatPrices, selectedSeatIds]);

  if (!showtimeId) {
    return <Navigate to="/showtimes" replace />;
  }

  const lockExpired = remainingMs <= 0;

  const handleExtend = async () => {
    if (lockExpired) {
      return;
    }

    try {
      const data = await extendMutation.mutateAsync();
      const expiresAt = data?.expiresAt || data?.lockedUntil;
      if (expiresAt) {
        setLock(new Date(expiresAt));
      }
      toastSuccess("Lock extended by 5 minutes");
    } catch (err) {
      toastError(err?.message || "Failed to extend lock", err?.requestId);
    }
  };

  const handleConfirmBooking = async () => {
    if (lockExpired) {
      return;
    }

    try {
      const booking = await confirmMutation.mutateAsync();
      hasConfirmedRef.current = true;
      clearBooking();
      toastSuccess("Booking confirmed!");
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      if (err?.status === 409) {
        toastConflict(
          "A seat conflict occurred — please start over",
          err?.requestId,
        );
        hasConfirmedRef.current = true;
        clearBooking();
        navigate(`/showtimes/${showtimeId}`);
        return;
      }

      toastError(err?.message || "Failed to confirm booking", err?.requestId);
    }
  };

  const handleGoBack = () => {
    hasConfirmedRef.current = true;
    clearBooking();
    navigate(`/showtimes/${showtimeId}`);
  };

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-base-content">
          Confirm Booking
        </h1>
        <p className="text-sm text-base-content/70">
          Review your locked seats before final confirmation.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lock Timer</CardTitle>
          <Badge
            variant={
              lockExpired
                ? "destructive"
                : remainingMs <= 60_000
                  ? "secondary"
                  : "default"
            }
          >
            {formatRemaining(remainingMs)}
          </Badge>
        </CardHeader>
        <CardContent>
          {lockExpired ? (
            <p className="text-sm font-medium text-error">Lock expired</p>
          ) : (
            <p className="text-sm text-base-content/70">
              Your seats are reserved while the timer is running.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected Seats</CardTitle>
        </CardHeader>
        <CardContent>
          {seatsQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" variant="shimmer" />
              <Skeleton className="h-10 w-full" variant="shimmer" />
            </div>
          ) : (
            <ul className="space-y-2">
              {seats.map((seat) => (
                <li
                  key={seat.id}
                  className="flex items-center justify-between rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm"
                >
                  <span className="capitalize">
                    {seat.seatType} · Row {seat.rowNumber} Seat{" "}
                    {seat.columnNumber}
                  </span>
                  <span className="font-semibold text-secondary">
                    {formatCurrency(seatPrices?.[seat.id])}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-base-300 pt-3 text-right font-semibold text-base-content">
            Total: {formatCurrency(total)}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={
            lockExpired || extendMutation.isPending || confirmMutation.isPending
          }
          onClick={handleExtend}
        >
          {extendMutation.isPending ? "Extending..." : "Extend Time"}
        </Button>

        <Button
          type="button"
          disabled={lockExpired || confirmMutation.isPending}
          onClick={handleConfirmBooking}
        >
          {confirmMutation.isPending ? "Confirming..." : "Confirm Booking"}
        </Button>

        {lockExpired ? (
          <Button type="button" variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>
        ) : null}
      </div>
    </section>
  );
}
