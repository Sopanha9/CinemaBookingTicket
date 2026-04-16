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
  createScreen,
  deleteScreen,
  getScreens,
  getTheaters,
  updateScreen,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastSuccess } from "../lib/toast";

const createSchema = z.object({
  theaterId: z.coerce.number().int().positive(),
  name: z.string().min(1, "Name is required"),
  screenType: z.enum(["regular", "imax", "3d", "4dx"]),
  totalRows: z.coerce.number().int().min(1).max(50),
  seatsPerRow: z.coerce.number().int().min(1).max(50),
  seatTypesConfig: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  screenType: z.enum(["regular", "imax", "3d", "4dx"]),
  isActive: z.boolean(),
});

export default function AdminScreensPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const screensQuery = useQuery({
    queryKey: ["admin-screens"],
    queryFn: () => getScreens({ includeInactive: "true" }),
  });

  const theatersQuery = useQuery({
    queryKey: ["admin-theaters"],
    queryFn: () => getTheaters({ includeInactive: "true" }),
  });

  const createForm = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      theaterId: "",
      name: "",
      screenType: "regular",
      totalRows: 10,
      seatsPerRow: 12,
      seatTypesConfig: "",
    },
  });

  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      screenType: "regular",
      isActive: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) => {
      if (editing) {
        return updateScreen(editing.id, values);
      }

      return createScreen({
        theaterId: values.theaterId,
        name: values.name,
        screenType: values.screenType,
        totalRows: values.totalRows,
        totalColumns: values.seatsPerRow,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-screens"] });
      toastSuccess(editing ? "Screen updated" : "Screen created");
      setOpen(false);
      setEditing(null);
      createForm.reset();
      editForm.reset({ name: "", screenType: "regular", isActive: true });
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to save screen",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (row) => deleteScreen(row.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-screens"] });
      toastSuccess("Screen deleted");
      setDeleteTarget(null);
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to delete screen",
      }),
  });

  const columns = useMemo(
    () => [
      { key: "name", label: "Name" },
      {
        key: "theater",
        label: "Theater",
        render: (row) => row.theater?.name || "-",
      },
      { key: "screenType", label: "Type" },
      {
        key: "size",
        label: "Size",
        render: (row) => `${row.totalRows} x ${row.totalColumns}`,
      },
      {
        key: "isActive",
        label: "Status",
        render: (row) => (row.isActive ? "Active" : "Inactive"),
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    createForm.reset({
      theaterId: "",
      name: "",
      screenType: "regular",
      totalRows: 10,
      seatsPerRow: 12,
      seatTypesConfig: "",
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    editForm.reset({
      name: row.name || "",
      screenType: row.screenType || "regular",
      isActive: Boolean(row.isActive),
    });
    setOpen(true);
  };

  const submit = (event) => {
    if (editing) {
      return editForm.handleSubmit((values) => saveMutation.mutate(values))(
        event,
      );
    }
    return createForm.handleSubmit((values) => saveMutation.mutate(values))(
      event,
    );
  };

  const formBody = editing ? (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <Input {...editForm.register("name")} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Screen Type</label>
        <Select {...editForm.register("screenType")}>
          <option value="regular">regular</option>
          <option value="imax">imax</option>
          <option value="3d">3d</option>
          <option value="4dx">4dx</option>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          {...editForm.register("isActive")}
        />
        Active
      </label>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="rounded-lg border border-info/40 bg-info/10 p-3 text-xs text-base-content/80">
        Seats are auto-generated when a screen is created.
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Theater</label>
        <Select {...createForm.register("theaterId")}>
          <option value="">Select theater</option>
          {(theatersQuery.data || []).map((theater) => (
            <option key={theater.id} value={theater.id}>
              {theater.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <Input {...createForm.register("name")} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Screen Type</label>
          <Select {...createForm.register("screenType")}>
            <option value="regular">regular</option>
            <option value="imax">imax</option>
            <option value="3d">3d</option>
            <option value="4dx">4dx</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Total Rows</label>
          <Input
            type="number"
            min="1"
            max="50"
            {...createForm.register("totalRows")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Seats Per Row</label>
          <Input
            type="number"
            min="1"
            max="50"
            {...createForm.register("seatsPerRow")}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Seat Types Config</label>
        <Input
          placeholder="Optional note"
          {...createForm.register("seatTypesConfig")}
        />
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Screens</CardTitle>
          <Button type="button" onClick={openCreate}>
            Create Screen
          </Button>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={screensQuery.data || []}
            isLoading={screensQuery.isPending}
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Screen" : "Create Screen"}
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
        title="Delete Screen"
        description="Delete requires confirmation."
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
