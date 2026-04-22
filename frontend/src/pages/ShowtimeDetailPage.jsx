import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import {
  getShowtimePricing,
  getShowtimeSeats,
} from "../features/showtimes/api";
import { createLock } from "../features/booking/api";
import { useBookingStore } from "../features/booking/bookingStore";
import { toastConflict, toastError } from "../lib/toast";

const formatCurrency = (value) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(value || 0));

const formatStartTime = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Invalid time"
    : date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// Seat styles — noir cinema theme
const seatStyle = {
  available: "border-white/20 bg-white/5 text-white/60 hover:border-secondary/70 hover:bg-secondary/15 hover:text-secondary cursor-pointer",
  locked: "cursor-not-allowed border-yellow-700/50 bg-yellow-900/20 text-yellow-600/60",
  booked: "cursor-not-allowed border-red-900/50 bg-red-950/30 text-red-700/60",
};

const seatSelectedStyle = "!border-secondary !bg-secondary/25 !text-secondary ring-1 ring-secondary/50 ring-offset-1 ring-offset-[#080809]";

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
    if (seatsQuery.isError) toastError(seatsQuery.error?.message || "Failed to load seats", seatsQuery.error?.requestId);
  }, [seatsQuery.error, seatsQuery.isError]);

  useEffect(() => {
    if (pricingQuery.isError) toastError(pricingQuery.error?.message || "Failed to load pricing", pricingQuery.error?.requestId);
  }, [pricingQuery.error, pricingQuery.isError]);

  const lockMutation = useMutation({ mutationFn: createLock });

  const seatData = seatsQuery.data;
  const pricingData = pricingQuery.data;

  useEffect(() => {
    if (seatData && id && initializedShowtimeRef.current !== id) {
      initializedShowtimeRef.current = id;
      initSelection(id);
    }
  }, [seatData, id, initSelection]);

  const groupedSeats = useMemo(() => {
    const seats = seatData?.seats ?? [];
    const map = new Map();
    for (const seat of seats) {
      const row = seat.rowNumber ?? "?";
      if (!map.has(row)) map.set(row, []);
      map.get(row).push(seat);
    }
    return Array.from(map.entries()).sort(([a], [b]) => String(a).localeCompare(String(b)));
  }, [seatData]);

  const total = useMemo(() => {
    const pricing = pricingData?.pricing ?? pricingData?.seatTypePricing ?? [];
    const priceMap = new Map(pricing.map((p) => [p.seatType, Number(p.price || 0)]));
    const seats = seatData?.seats ?? [];
    return selectedSeatIds.reduce((sum, seatId) => {
      const seat = seats.find((s) => s.id === seatId);
      return sum + (seat ? (priceMap.get(seat.seatType) ?? 0) : 0);
    }, 0);
  }, [selectedSeatIds, seatData, pricingData]);

  const isLoading = seatsQuery.isPending || pricingQuery.isPending;
  const hasError = seatsQuery.isError || pricingQuery.isError;
  const isForbidden = seatsQuery.error?.status === 403 || pricingQuery.error?.status === 403;

  const handleToggleSeat = (seat) => {
    if (seat.availability !== "available") return;
    toggleSeat(seat.id);
  };

  const handleSelectSeats = async () => {
    if (!id || selectedSeatIds.length === 0) return;
    try {
      const lockData = await lockMutation.mutateAsync({ showtimeId: id, seatIds: selectedSeatIds, lockMinutes });
      const expiresAt = lockData?.expiresAt || lockData?.lockedUntil;
      if (expiresAt) setLock(new Date(expiresAt));
      navigate("/bookings/confirm");
    } catch (err) {
      if (err?.status === 409) {
        toastConflict("Some seats were just taken — please reselect", err?.requestId);
        seatsQuery.refetch();
        return;
      }
      toastError(err?.message || "Failed to lock selected seats", err?.requestId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-8 w-72" variant="shimmer" />
        <Skeleton className="h-4 w-48" variant="shimmer" />
        <Skeleton className="h-80 w-full rounded-xl" variant="shimmer" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/10 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-error">
            {isForbidden ? "You don't have permission to view this." : "Failed to load showtime details. Please try again."}
          </p>
          <Button type="button" onClick={() => { seatsQuery.refetch(); pricingQuery.refetch(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const showtime = seatData?.showtime;
  const summary = seatData?.summary || {};
  const dayType = pricingData?.dayType || summary?.dayType;
  const pricingRows = pricingData?.pricing || pricingData?.seatTypePricing || [];

  return (
    <section className="pb-28">
      {/* ── Movie Header ── */}
      <div className="mb-6 space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary/70">Now Showing</p>
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">
          {showtime?.movie?.title || "Showtime"}
        </h1>
        <p className="text-sm text-white/40">
          {showtime?.screen?.theater?.name || "Theater"}
          <span className="mx-2 text-white/20">·</span>
          {showtime?.screen?.name || "Screen"}
          <span className="mx-2 text-white/20">·</span>
          {formatStartTime(showtime?.startTime)}
        </p>
      </div>

      {/* ── Stats badges ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="rounded border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
          Available: <span className="text-green-400">{summary.availableSeats ?? 0}</span>
        </span>
        <span className="rounded border border-yellow-700/30 bg-yellow-900/10 px-3 py-1 text-xs font-semibold text-yellow-600/70">
          Locked: {summary.lockedSeats ?? 0}
        </span>
        <span className="rounded border border-red-900/30 bg-red-950/10 px-3 py-1 text-xs font-semibold text-red-700/70">
          Booked: {summary.bookedSeats ?? 0}
        </span>
        {dayType && (
          <span className="rounded border border-secondary/30 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary/80">
            {dayType}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Seat Map ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-white/[0.07] bg-[#0d0d10] p-5">
            {/* Screen indicator */}
            <div className="mb-6 text-center">
              <div className="mx-auto h-1.5 w-2/3 max-w-xs rounded-full bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">Screen</p>
            </div>

            {/* Legend */}
            <div className="mb-5 flex flex-wrap justify-center gap-4 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded border border-white/20 bg-white/5" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded border border-secondary/60 bg-secondary/20" />
                Selected
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded border border-yellow-700/50 bg-yellow-900/20" />
                Locked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded border border-red-900/50 bg-red-950/30" />
                Booked
              </span>
            </div>

            {/* Seat rows */}
            <div className="space-y-2.5">
              {groupedSeats.map(([row, rowSeats]) => (
                <div key={row} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-7 text-center text-xs font-bold text-white/25">{row}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rowSeats.map((seat) => {
                      const selected = selectedSeatIds.includes(seat.id);
                      const availability = seat.availability || "locked";
                      const seatLabel = `${seat.rowNumber}-${seat.columnNumber}`;
                      const seatTypeLabel = typeof seat.seatType === "string" && seat.seatType.length > 0
                        ? `${seat.seatType.charAt(0).toUpperCase()}${seat.seatType.slice(1)}`
                        : "Standard";

                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={availability !== "available"}
                          onClick={() => handleToggleSeat(seat)}
                          title={`${seatLabel} — ${seatTypeLabel} (${availability})`}
                          aria-label={`Row ${seat.rowNumber} Seat ${seat.columnNumber} - ${seatTypeLabel} - ${availability}`}
                          className={[
                            "min-w-[3rem] rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all duration-150",
                            seatStyle[availability] || seatStyle.locked,
                            selected ? seatSelectedStyle : "",
                          ].filter(Boolean).join(" ")}
                        >
                          {seatLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pricing Sidebar ── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Pricing card */}
            <div className="rounded-xl border border-white/[0.07] bg-[#111114] p-5">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-secondary/70">Pricing</h2>
              <ul className="space-y-2">
                {pricingRows.map((entry) => (
                  <li key={entry.seatType} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <span className="text-sm capitalize text-white/60">{entry.seatType}</span>
                    <span className="text-sm font-black text-secondary">{formatCurrency(entry.price)}</span>
                  </li>
                ))}
                {pricingRows.length === 0 && (
                  <li className="text-xs text-white/30">No pricing data</li>
                )}
              </ul>
            </div>

            {/* Selection summary (desktop) */}
            {selectedSeatIds.length > 0 && (
              <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-5">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary/70">Your Selection</h2>
                <p className="text-sm text-white/60">
                  <span className="text-white font-bold">{selectedSeatIds.length}</span> seat{selectedSeatIds.length !== 1 ? "s" : ""} selected
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-white/40">Total</span>
                  <span className="text-xl font-black text-secondary">{formatCurrency(total)}</span>
                </div>
                <button
                  type="button"
                  disabled={lockMutation.isPending}
                  onClick={handleSelectSeats}
                  className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                >
                  {lockMutation.isPending ? "Locking..." : "Confirm Seats →"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-bold text-white">
              {selectedSeatIds.length} seat{selectedSeatIds.length !== 1 ? "s" : ""} selected
            </p>
            <p className="text-xs text-white/40">Total: <span className="font-bold text-secondary">{formatCurrency(total)}</span></p>
          </div>
          <Button
            type="button"
            disabled={selectedSeatIds.length === 0 || lockMutation.isPending}
            onClick={handleSelectSeats}
            className="!bg-primary hover:!bg-primary/90 !font-bold !uppercase !tracking-widest !text-xs !px-6"
          >
            {lockMutation.isPending ? "Locking seats..." : "Select Seats →"}
          </Button>
        </div>
      </div>
    </section>
  );
}
