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
import {
  createGenre,
  deleteGenre,
  getGenres,
  updateGenre,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastSuccess } from "../lib/toast";

const genreSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export default function AdminGenresPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const genresQuery = useQuery({
    queryKey: ["admin-genres"],
    queryFn: getGenres,
  });

  const form = useForm({
    resolver: zodResolver(genreSchema),
    defaultValues: { name: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing ? updateGenre(editing.id, values) : createGenre(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });
      toastSuccess(editing ? "Genre updated" : "Genre created");
      setOpen(false);
      setEditing(null);
      form.reset({ name: "" });
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        conflictMessage: "Genre already exists",
        fallbackMessage: "Failed to save genre",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (row) => deleteGenre(row.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-genres"] });
      toastSuccess("Genre deleted");
      setDeleteTarget(null);
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to delete genre",
      }),
  });

  const columns = useMemo(
    () => [
      { key: "name", label: "Name" },
      {
        key: "movies",
        label: "Movies",
        render: (row) => row.movies?.length || 0,
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "" });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.reset({ name: row.name || "" });
    setOpen(true);
  };

  const submit = form.handleSubmit((values) => saveMutation.mutate(values));

  const formBody = (
    <div className="space-y-1">
      <label className="text-sm font-medium">Name</label>
      <Input {...form.register("name")} />
      {form.formState.errors.name ? (
        <p className="text-xs text-error">
          {form.formState.errors.name.message}
        </p>
      ) : null}
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Genres</CardTitle>
          <Button type="button" onClick={openCreate}>
            Create Genre
          </Button>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={genresQuery.data || []}
            isLoading={genresQuery.isPending}
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Genre" : "Create Genre"}
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
        title="Delete Genre"
        description="This action permanently removes the genre."
        form={<p className="text-sm">Delete {deleteTarget?.name}?</p>}
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
