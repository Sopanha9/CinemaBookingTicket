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
  getTheaters,
  createTheater,
  updateTheater,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastSuccess } from "../lib/toast";

const theaterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  isActive: z.boolean(),
});

export default function AdminTheatersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const theatersQuery = useQuery({
    queryKey: ["admin-theaters"],
    queryFn: () => getTheaters({ includeInactive: "true" }),
  });

  const form = useForm({
    resolver: zodResolver(theaterSchema),
    defaultValues: {
      name: "",
      location: "",
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) => {
      if (editing) {
        return updateTheater(editing.id, values);
      }
      return createTheater(values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-theaters"] });
      toastSuccess(editing ? "Theater updated" : "Theater created");
      setOpen(false);
      setEditing(null);
      form.reset({ name: "", location: "", isActive: true });
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        conflictMessage: "Theater already exists",
        fallbackMessage: "Failed to save theater",
      }),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (row) => updateTheater(row.id, { isActive: false }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-theaters"] });
      toastSuccess("Theater deactivated");
      setDeleteTarget(null);
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to deactivate theater",
      }),
  });

  const columns = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "location", label: "Location" },
      {
        key: "isActive",
        label: "Status",
        render: (row) => (row.isActive ? "Active" : "Inactive"),
      },
      {
        key: "screensCount",
        label: "Screens",
        render: (row) => row.screens?.length || 0,
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", location: "", isActive: true });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.reset({
      name: row.name || "",
      location: row.location || "",
      isActive: Boolean(row.isActive),
    });
    setOpen(true);
  };

  const submit = form.handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  const formBody = (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <Input {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-xs text-error">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Location</label>
        <Input {...form.register("location")} />
        {form.formState.errors.location ? (
          <p className="text-xs text-error">
            {form.formState.errors.location.message}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          {...form.register("isActive")}
        />
        Active
      </label>
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Theaters</CardTitle>
          <Button type="button" onClick={openCreate}>
            Create Theater
          </Button>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={theatersQuery.data || []}
            isLoading={theatersQuery.isPending}
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Theater" : "Create Theater"}
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
        title="Deactivate Theater"
        description="This will soft delete the theater by setting isActive=false."
        form={
          <p className="text-sm">
            Are you sure you want to deactivate {deleteTarget?.name}?
          </p>
        }
        onSubmit={(event) => {
          event.preventDefault();
          if (deleteTarget) {
            softDeleteMutation.mutate(deleteTarget);
          }
        }}
        isSubmitting={softDeleteMutation.isPending}
        submitLabel="Confirm"
      />
    </section>
  );
}
