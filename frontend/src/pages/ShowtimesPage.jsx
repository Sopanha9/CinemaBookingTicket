import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { getShowtimeSeats, getShowtimes } from "../features/showtimes/api";

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
    if (showtime?.movie?.id && showtime?.movie?.title) {
      movieMap.set(String(showtime.movie.id), showtime.movie.title);
    }

    if (showtime?.screen?.theater?.id && showtime?.screen?.theater?.name) {
      theaterMap.set(
        String(showtime.screen.theater.id),
        showtime.screen.theater.name,
      );
    }
  }

  const movies = Array.from(movieMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const theaters = Array.from(theaterMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { movies, theaters };
};

const formatShowtime = (iso) => {
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

export default function ShowtimesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const showtimesQuery = useQuery({
    queryKey: ["showtimes", filters],
    queryFn: () => getShowtimes(filters),
  });

  const showtimes = Array.isArray(showtimesQuery.data)
    ? showtimesQuery.data
    : [];

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
      const showtime = showtimes[i];
      const query = availabilityQueries[i];
      map.set(showtime.id, query?.data?.summary?.availableSeats);
    }

    return map;
  }, [availabilityQueries, showtimes]);

  const { movies, theaters } = useMemo(
    () => buildDistinctOptions(showtimes),
    [showtimes],
  );

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    setSearchParams(next, { replace: false });
  };

  const isLoading = showtimesQuery.isPending;
  const isError = showtimesQuery.isError;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-base-content">Showtimes</h1>
        <p className="text-sm text-base-content/70">
          Discover upcoming screenings and pick your perfect seat.
        </p>
      </header>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Date
              </span>
              <input
                type="date"
                className="h-10 w-full rounded-lg border border-base-300 bg-base-100 px-3 text-sm text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/70"
                value={filters.date || ""}
                onChange={(event) => updateFilter("date", event.target.value)}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Movie
              </span>
              <Select
                value={filters.movieId || ""}
                onChange={(event) =>
                  updateFilter("movieId", event.target.value)
                }
              >
                <option value="">All movies</option>
                {movies.map((movie) => (
                  <option key={movie.value} value={movie.value}>
                    {movie.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Theater
              </span>
              <Select
                value={filters.theaterId || ""}
                onChange={(event) =>
                  updateFilter("theaterId", event.target.value)
                }
              >
                <option value="">All theaters</option>
                {theaters.map((theater) => (
                  <option key={theater.value} value={theater.value}>
                    {theater.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-200 px-3 py-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={filters.includePast === "true"}
                onChange={(event) =>
                  updateFilter(
                    "includePast",
                    event.target.checked ? "true" : "",
                  )
                }
              />
              <span className="text-sm text-base-content">Include past</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" variant="shimmer" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" variant="shimmer" />
                  <Skeleton className="h-4 w-5/6" variant="shimmer" />
                  <Skeleton className="h-4 w-2/3" variant="shimmer" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {isError ? (
        <Card className="border-error/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-error">
                Failed to load showtimes. Please try again.
              </p>
              <button
                type="button"
                onClick={() => showtimesQuery.refetch()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && showtimes.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
            <p className="text-4xl" aria-hidden="true">
              🎬
            </p>
            <h2 className="text-lg font-semibold">
              No showtimes found - try adjusting your filters
            </h2>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && showtimes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {showtimes.map((showtime) => {
            const availableSeats = availabilityByShowtimeId.get(showtime.id);

            return (
              <button
                key={showtime.id}
                type="button"
                onClick={() => navigate(`/showtimes/${showtime.id}`)}
                className="text-left"
              >
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-primary">
                      {showtime.movie?.title || "Untitled Movie"}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-2 text-sm text-base-content/80">
                    <p>
                      <span className="font-semibold text-base-content">
                        Theater:
                      </span>{" "}
                      {showtime.screen?.theater?.name || "Unknown theater"}
                    </p>
                    <p>
                      <span className="font-semibold text-base-content">
                        Screen:
                      </span>{" "}
                      {showtime.screen?.name || "Unknown screen"}
                    </p>
                    <p>
                      <span className="font-semibold text-base-content">
                        Starts:
                      </span>{" "}
                      {formatShowtime(showtime.startTime)}
                    </p>
                    <p>
                      <span className="font-semibold text-base-content">
                        Available seats:
                      </span>{" "}
                      {typeof availableSeats === "number"
                        ? availableSeats
                        : "..."}
                    </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
