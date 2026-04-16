import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import {
  createShowtime,
  getMovies,
  getScreens,
  getShowtimes,
  updateShowtime,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastConflict, toastSuccess, toastValidation } from "../lib/toast";

const toIsoFromLocal = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const toLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
};

const showtimeSchema = z
  .object({
    movieId: z.coerce.number().int().positive(),
    screenId: z.coerce.number().int().positive(),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    basePrice: z.coerce.number().positive(),
    status: z.enum(["scheduled", "cancelled", "completed"]),
  })
  .superRefine((values, ctx) => {
    const start = new Date(values.startTime);
    const end = new Date(values.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
  });

export default function AdminShowtimesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [theaterFilter, setTheaterFilter] = useState("");

  const showtimesQuery = useQuery({
    queryKey: ["admin-showtimes"],
    queryFn: getShowtimes,
  });

  const moviesQuery = useQuery({
    queryKey: ["admin-movies"],
    queryFn: getMovies,
  });

  const screensQuery = useQuery({
    queryKey: ["admin-screens"],
    queryFn: () => getScreens({ includeInactive: "true" }),
  });

  const form = useForm({
    resolver: zodResolver(showtimeSchema),
    defaultValues: {
      movieId: "",
      screenId: "",
      startTime: "",
      endTime: "",
      basePrice: 10,
      status: "scheduled",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const selectedMovie = (moviesQuery.data || []).find(
        (movie) => movie.id === Number(values.movieId),
      );

      const start = new Date(values.startTime);
      const end = new Date(values.endTime);
      const durationMins = Math.ceil((end.getTime() - start.getTime()) / 60000);

      if (selectedMovie && durationMins < Number(selectedMovie.duration || 0)) {
        const error = new Error(
          `Showtime must be at least movie duration (${selectedMovie.duration} minutes)`,
        );
        error.status = 400;
        error.details = [
          {
            message: `Showtime must be at least movie duration (${selectedMovie.duration} minutes)`,
          },
        ];
        throw error;
      }

      const payload = {
        movieId: Number(values.movieId),
        screenId: Number(values.screenId),
        startTime: toIsoFromLocal(values.startTime),
        endTime: toIsoFromLocal(values.endTime),
        basePrice: Number(values.basePrice),
        status: values.status,
      };

      if (editing) {
        return updateShowtime(editing.id, payload);
      }

      return createShowtime(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-showtimes"] });
      toastSuccess(editing ? "Showtime updated" : "Showtime created");
      setOpen(false);
      setEditing(null);
      form.reset({
        movieId: "",
        screenId: "",
        startTime: "",
        endTime: "",
        basePrice: 10,
        status: "scheduled",
      });
    },
    onError: (err) => {
      if (err?.status === 409) {
        toastConflict(
          "This screen has an overlapping showtime — choose a different time",
          err?.requestId,
        );
        return;
      }

      if (err?.status === 400 && Array.isArray(err?.details)) {
        toastValidation(err.details);
        return;
      }

      handleAdminMutationError(err, {
        fallbackMessage: "Failed to save showtime",
      });
    },
  });

  const submit = form.handleSubmit((values) => saveMutation.mutate(values));

  const theaters = useMemo(() => {
    const map = new Map();
    for (const screen of screensQuery.data || []) {
      if (screen.theater?.id) {
        map.set(screen.theater.id, screen.theater.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [screensQuery.data]);

  const filteredShowtimes = useMemo(() => {
    return (showtimesQuery.data || []).filter((showtime) => {
      const start = new Date(showtime.startTime);
      if (Number.isNaN(start.getTime())) {
        return false;
      }

      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);
        if (start < from) return false;
      }

      if (toDate) {
        const to = new Date(`${toDate}T23:59:59`);
        if (start > to) return false;
      }

      if (
        theaterFilter &&
        String(showtime.screen?.theater?.id) !== theaterFilter
      ) {
        return false;
      }

      return true;
    });
  }, [fromDate, showtimesQuery.data, theaterFilter, toDate]);

  const columns = useMemo(
    () => [
      {
        key: "movie",
        label: "Movie",
        render: (row) => row.movie?.title || "-",
      },
      {
        key: "screen",
        label: "Screen",
        render: (row) =>
          `${row.screen?.theater?.name || "-"} / ${row.screen?.name || "-"}`,
      },
      {
        key: "startTime",
        label: "Start",
        render: (row) => new Date(row.startTime).toLocaleString(),
      },
      {
        key: "endTime",
        label: "End",
        render: (row) => new Date(row.endTime).toLocaleString(),
      },
      {
        key: "basePrice",
        label: "Base Price",
        render: (row) => `$${Number(row.basePrice || 0).toFixed(2)}`,
      },
      { key: "status", label: "Status" },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({
      movieId: "",
      screenId: "",
      startTime: "",
      endTime: "",
      basePrice: 10,
      status: "scheduled",
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.reset({
      movieId: String(row.movieId),
      screenId: String(row.screenId),
      startTime: toLocalInput(row.startTime),
      endTime: toLocalInput(row.endTime),
      basePrice: Number(row.basePrice || 10),
      status: row.status || "scheduled",
    });
    setOpen(true);
  };

  const formBody = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Movie</label>
          <Select {...form.register("movieId")}>
            <option value="">Select movie</option>
            {(moviesQuery.data || []).map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Screen</label>
          <Select {...form.register("screenId")}>
            <option value="">Select screen</option>
            {(screensQuery.data || []).map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.theater?.name} / {screen.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Start Time</label>
          <Input type="datetime-local" {...form.register("startTime")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">End Time</label>
          <Input type="datetime-local" {...form.register("endTime")} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Base Price</label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            {...form.register("basePrice")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <Select {...form.register("status")}>
            <option value="scheduled">scheduled</option>
            <option value="cancelled">cancelled</option>
            <option value="completed">completed</option>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Showtimes</CardTitle>
            <Button type="button" onClick={openCreate}>
              Create Showtime
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
            <Select
              value={theaterFilter}
              onChange={(event) => setTheaterFilter(event.target.value)}
            >
              <option value="">All theaters</option>
              {theaters.map((theater) => (
                <option key={theater.id} value={String(theater.id)}>
                  {theater.name}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={filteredShowtimes}
            isLoading={showtimesQuery.isPending}
            onEdit={openEdit}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Showtime" : "Create Showtime"}
        form={formBody}
        onSubmit={submit}
        isSubmitting={saveMutation.isPending}
        submitLabel={editing ? "Update" : "Create"}
      />
    </section>
  );
}
