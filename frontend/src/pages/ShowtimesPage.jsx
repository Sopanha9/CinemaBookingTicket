import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "../components/ui/Skeleton";
import { Select } from "../components/ui/Select";
import { getShowtimeSeats, getShowtimes } from "../features/showtimes/api";

const POSTER_COLORS = [
  "1a0a00/d4a017", "0a001a/9b59b6", "001a0a/27ae60",
  "1a0000/c0392b", "000f1a/2980b9", "0d0d00/f39c12",
];

const getPosterUrl = (id) => {
  const color = POSTER_COLORS[id % POSTER_COLORS.length];
  return `https://placehold.co/300x450/${color}?text=🎬`;
};

const parseFilters = (searchParams) => ({
  date: searchParams.get("date") || undefined,
  movieId: searchParams.get("movieId") || undefined,
  theaterId: searchParams.get("theaterId") || undefined,
  includePast: searchParams.get("includePast") === "true" ? "true" : undefined,
});

const buildDistinctOptions = (showtimes) => {
  const movieMap = new Map();
  const theaterMap = new Map();
  for (const showtime of showtimes) {
    if (showtime?.movie?.id && showtime?.movie?.title)
      movieMap.set(String(showtime.movie.id), showtime.movie.title);
    if (showtime?.screen?.theater?.id && showtime?.screen?.theater?.name)
      theaterMap.set(String(showtime.screen.theater.id), showtime.screen.theater.name);
  }
  const movies = Array.from(movieMap.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  const theaters = Array.from(theaterMap.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  return { movies, theaters };
};

const formatShowtime = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Invalid time" : date.toLocaleString([], {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export default function ShowtimesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const showtimesQuery = useQuery({
    queryKey: ["showtimes", filters],
    queryFn: () => getShowtimes(filters),
  });

  const showtimes = Array.isArray(showtimesQuery.data) ? showtimesQuery.data : [];

  const availabilityQueries = useQueries({
    queries: showtimes.map((showtime) => ({
      queryKey: ["showtime-seats", showtime.id],
      queryFn: () => getShowtimeSeats(showtime.id),
      staleTime: 30 * 1000,
    })),
  });

  const availabilityByShowtimeId = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < showtimes.length; i += 1) {
      map.set(showtimes[i].id, availabilityQueries[i]?.data?.summary?.availableSeats);
    }
    return map;
  }, [availabilityQueries, showtimes]);

  const { movies, theaters } = useMemo(() => buildDistinctOptions(showtimes), [showtimes]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key); else next.set(key, value);
    setSearchParams(next, { replace: false });
  };

  const isLoading = showtimesQuery.isPending;
  const isError = showtimesQuery.isError;
  const isForbidden = showtimesQuery.error?.status === 403;

  return (
    <div>
      {/* ── Hero Banner ── */}
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 mb-10 overflow-hidden rounded-2xl mx-0">
        <div className="relative h-56 sm:h-72 lg:h-80 w-full overflow-hidden rounded-2xl">
          {/* Gradient hero bg (cinematic) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a00] via-[#0a0a0c] to-[#000d1a]" />
          {/* Scanline texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
            }}
          />
          {/* Spotlight glow */}
          <div className="absolute top-0 left-1/2 h-64 w-96 -translate-x-1/2 -translate-y-1/3 rounded-full bg-secondary/10 blur-[80px]" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-secondary/80">
              Now Playing
            </p>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg">
              Tonight's <span className="text-secondary">Screenings</span>
            </h1>
            <p className="mt-1 text-sm text-white/40 max-w-sm">
              Select your showtime, pick your seats, and enjoy the cinema experience.
            </p>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ── */}
      <div className="mb-8 rounded-xl border border-white/[0.07] bg-[#111114] p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary/60">
          Filter Showtimes
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/40">Date</span>
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-white/10 bg-[#0a0a0c] px-3 text-sm text-white placeholder-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
              value={filters.date || ""}
              onChange={(e) => updateFilter("date", e.target.value)}
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/40">Movie</span>
            <Select value={filters.movieId || ""} onChange={(e) => updateFilter("movieId", e.target.value)}>
              <option value="">All movies</option>
              {movies.map((movie) => (
                <option key={movie.value} value={movie.value}>{movie.label}</option>
              ))}
            </Select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-white/40">Theater</span>
            <Select value={filters.theaterId || ""} onChange={(e) => updateFilter("theaterId", e.target.value)}>
              <option value="">All theaters</option>
              {theaters.map((theater) => (
                <option key={theater.value} value={theater.value}>{theater.label}</option>
              ))}
            </Select>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0a0a0c] px-3 py-2 cursor-pointer hover:border-secondary/30 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-sm accent-secondary"
              checked={filters.includePast === "true"}
              onChange={(e) => updateFilter("includePast", e.target.checked ? "true" : "")}
            />
            <span className="text-sm text-white/60">Include past</span>
          </label>
        </div>
      </div>

      {/* ── Loading Skeletons ── */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111114]">
              <Skeleton className="h-56 w-full rounded-none" variant="shimmer" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-5 w-3/4" variant="shimmer" />
                <Skeleton className="h-4 w-full" variant="shimmer" />
                <Skeleton className="h-4 w-2/3" variant="shimmer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-error/30 bg-error/10 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-error">
              {isForbidden ? "You don't have permission to view this." : "Failed to load showtimes. Please try again."}
            </p>
            <button
              type="button"
              onClick={() => showtimesQuery.refetch()}
              className="self-start rounded border border-primary/50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-primary hover:bg-primary/10 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && !isError && showtimes.length === 0 && (
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-xl border border-white/[0.07] bg-[#111114] text-center">
          <span className="text-5xl opacity-40">🎬</span>
          <p className="text-lg font-semibold text-white/60">No showtimes found</p>
          <p className="text-sm text-white/30">Try adjusting your filters</p>
        </div>
      )}

      {/* ── Now Showing Grid ── */}
      {!isLoading && !isError && showtimes.length > 0 && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-secondary/70">
              Now Showing
            </h2>
            <div className="h-px flex-1 bg-white/[0.05]" />
            <span className="text-xs text-white/30">{showtimes.length} results</span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {showtimes.map((showtime) => {
              const availableSeats = availabilityByShowtimeId.get(showtime.id);
              const posterIdx = (showtime.movie?.id ?? 0) % POSTER_COLORS.length;
              const posterUrl = `https://placehold.co/300x450/${POSTER_COLORS[posterIdx]}?text=`;
              const isAlmostFull = typeof availableSeats === "number" && availableSeats <= 10 && availableSeats > 0;
              const isSoldOut = typeof availableSeats === "number" && availableSeats === 0;

              return (
                <button
                  key={showtime.id}
                  type="button"
                  onClick={() => navigate(`/showtimes/${showtime.id}`)}
                  className="group text-left"
                >
                  <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111114] transition-all duration-300 hover:-translate-y-1 hover:border-secondary/30 hover:shadow-[0_0_30px_rgba(212,160,23,0.08)]">
                    {/* Poster */}
                    <div className="relative h-56 w-full overflow-hidden bg-[#0a0a0c]">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{
                          backgroundImage: `url(${posterUrl})`,
                          backgroundSize: "cover",
                        }}
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-transparent to-transparent" />

                      {/* Seat badge */}
                      <div className="absolute top-3 right-3">
                        {isSoldOut ? (
                          <span className="rounded border border-error/50 bg-error/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
                            Sold Out
                          </span>
                        ) : isAlmostFull ? (
                          <span className="rounded border border-yellow-500/50 bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-400">
                            Almost Full
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2">
                      <h3 className="line-clamp-1 text-base font-black uppercase tracking-tight text-secondary group-hover:text-secondary/90">
                        {showtime.movie?.title || "Untitled Movie"}
                      </h3>

                      <div className="space-y-1 text-xs text-white/50">
                        <p className="flex items-center gap-1.5">
                          <span className="text-white/30">▸</span>
                          <span className="font-semibold text-white/70">{showtime.screen?.theater?.name || "Unknown theater"}</span>
                          <span className="text-white/30">·</span>
                          <span>{showtime.screen?.name || "?"}</span>
                        </p>
                        <p className="text-white/40">
                          {formatShowtime(showtime.startTime)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-white/30">
                          {typeof availableSeats === "number" ? (
                            <span className={isSoldOut ? "text-error/70" : "text-white/40"}>
                              {availableSeats} seats left
                            </span>
                          ) : (
                            <span className="text-white/20">Loading...</span>
                          )}
                        </span>
                        <span className="rounded border border-primary/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary transition-all group-hover:bg-primary/10 group-hover:border-primary/60">
                          Book Now →
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
