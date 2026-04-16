import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../components/ui/Badge";
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
  addMovieGenre,
  createMovie,
  deleteMovie,
  getGenres,
  getMovies,
  removeMovieGenre,
  updateMovie,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastSuccess } from "../lib/toast";

const movieSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.coerce.number().int().positive("Duration is required"),
  language: z.string().optional(),
  posterUrl: z.string().optional(),
  status: z.enum(["upcoming", "now_showing", "ended"]),
});

export default function AdminMoviesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [genreToAdd, setGenreToAdd] = useState("");

  const moviesQuery = useQuery({
    queryKey: ["admin-movies"],
    queryFn: getMovies,
  });

  const genresQuery = useQuery({
    queryKey: ["admin-genres"],
    queryFn: getGenres,
  });

  const form = useForm({
    resolver: zodResolver(movieSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: 90,
      language: "English",
      posterUrl: "",
      status: "upcoming",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing ? updateMovie(editing.id, values) : createMovie(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      toastSuccess(editing ? "Movie updated" : "Movie created");
      setOpen(false);
      setEditing(null);
      setGenreToAdd("");
      form.reset({
        title: "",
        description: "",
        duration: 90,
        language: "English",
        posterUrl: "",
        status: "upcoming",
      });
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to save movie",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (row) => deleteMovie(row.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      toastSuccess("Movie deleted");
      setDeleteTarget(null);
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to delete movie",
      }),
  });

  const addGenreMutation = useMutation({
    mutationFn: ({ movieId, genreId }) => addMovieGenre({ movieId, genreId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      toastSuccess("Genre linked to movie");
      setGenreToAdd("");
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        conflictMessage: "Genre is already linked to this movie",
        fallbackMessage: "Failed to link genre",
      }),
  });

  const removeGenreMutation = useMutation({
    mutationFn: ({ movieId, genreId }) => removeMovieGenre(movieId, genreId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-movies"] });
      toastSuccess("Genre unlinked from movie");
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to unlink genre",
      }),
  });

  const columns = useMemo(
    () => [
      { key: "title", label: "Title" },
      { key: "duration", label: "Duration" },
      { key: "language", label: "Language" },
      { key: "status", label: "Status" },
      {
        key: "genres",
        label: "Genres",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {(row.genres || []).map((link) => (
              <Badge key={link.genreId} variant="outline">
                {link.genre?.name}
              </Badge>
            ))}
          </div>
        ),
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    setGenreToAdd("");
    form.reset({
      title: "",
      description: "",
      duration: 90,
      language: "English",
      posterUrl: "",
      status: "upcoming",
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setGenreToAdd("");
    form.reset({
      title: row.title || "",
      description: row.description || "",
      duration: Number(row.duration || 90),
      language: row.language || "",
      posterUrl: row.posterUrl || "",
      status: row.status || "upcoming",
    });
    setOpen(true);
  };

  const linkedGenreIds = new Set(
    (editing?.genres || []).map((entry) => entry.genreId),
  );
  const addableGenres = (genresQuery.data || []).filter(
    (genre) => !linkedGenreIds.has(genre.id),
  );

  const submit = form.handleSubmit((values) => saveMutation.mutate(values));

  const formBody = (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Title</label>
        <Input {...form.register("title")} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <Input {...form.register("description")} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Duration (minutes)</label>
          <Input type="number" min="1" {...form.register("duration")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Language</label>
          <Input {...form.register("language")} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <Select {...form.register("status")}>
            <option value="upcoming">upcoming</option>
            <option value="now_showing">now_showing</option>
            <option value="ended">ended</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Poster URL</label>
        <Input {...form.register("posterUrl")} />
      </div>

      {editing ? (
        <div className="space-y-2 rounded-lg border border-base-300 p-3">
          <p className="text-sm font-semibold">Manage Genres</p>
          <div className="flex flex-wrap gap-2">
            {(editing.genres || []).map((entry) => (
              <Badge
                key={entry.genreId}
                variant="outline"
                className="flex items-center gap-2"
              >
                {entry.genre?.name}
                <button
                  type="button"
                  className="text-xs"
                  onClick={() =>
                    removeGenreMutation.mutate({
                      movieId: editing.id,
                      genreId: entry.genreId,
                    })
                  }
                >
                  ✕
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={genreToAdd}
              onChange={(event) => setGenreToAdd(event.target.value)}
            >
              <option value="">Select genre to add</option>
              {addableGenres.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              disabled={!genreToAdd || addGenreMutation.isPending}
              onClick={() =>
                addGenreMutation.mutate({
                  movieId: editing.id,
                  genreId: Number(genreToAdd),
                })
              }
            >
              Add Genre
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Movies</CardTitle>
          <Button type="button" onClick={openCreate}>
            Create Movie
          </Button>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={moviesQuery.data || []}
            isLoading={moviesQuery.isPending}
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Movie" : "Create Movie"}
        form={formBody}
        onSubmit={submit}
        isSubmitting={saveMutation.isPending}
        submitLabel={editing ? "Update" : "Create"}
      />

      <EntityDialog
        open={Boolean(deleteTarget)}
        onClose={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        title="Delete Movie"
        description="Delete requires confirmation."
        form={<p className="text-sm">Delete {deleteTarget?.title}?</p>}
        onSubmit={(event) => {
          event.preventDefault();
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
        isSubmitting={deleteMutation.isPending}
        submitLabel="Delete"
      />
    </section>
  );
}
