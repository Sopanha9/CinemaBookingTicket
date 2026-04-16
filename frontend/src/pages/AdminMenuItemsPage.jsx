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
  createMenuItem,
  deleteMenuItem,
  getMenuItems,
  updateMenuItem,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastSuccess } from "../lib/toast";

const menuSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be positive"),
  category: z.string().optional(),
  isAvailable: z.boolean(),
});

export default function AdminMenuItemsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const menuQuery = useQuery({
    queryKey: ["admin-menu-items"],
    queryFn: getMenuItems,
  });

  const form = useForm({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 1,
      category: "snack",
      isAvailable: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing ? updateMenuItem(editing.id, values) : createMenuItem(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toastSuccess(editing ? "Menu item updated" : "Menu item created");
      setOpen(false);
      setEditing(null);
      form.reset({
        name: "",
        description: "",
        price: 1,
        category: "snack",
        isAvailable: true,
      });
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to save menu item",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (row) => deleteMenuItem(row.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-menu-items"] });
      toastSuccess("Menu item updated");
      setDeleteTarget(null);
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to delete menu item",
      }),
  });

  const columns = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "category", label: "Category" },
      {
        key: "price",
        label: "Price",
        render: (row) => `$${Number(row.price || 0).toFixed(2)}`,
      },
      {
        key: "isAvailable",
        label: "Available",
        render: (row) => (row.isAvailable ? "Yes" : "No"),
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      description: "",
      price: 1,
      category: "snack",
      isAvailable: true,
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.reset({
      name: row.name || "",
      description: row.description || "",
      price: Number(row.price || 1),
      category: row.category || "snack",
      isAvailable: Boolean(row.isAvailable),
    });
    setOpen(true);
  };

  const submit = form.handleSubmit((values) => saveMutation.mutate(values));

  const formBody = (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Name</label>
        <Input {...form.register("name")} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <Input {...form.register("description")} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Price</label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            {...form.register("price")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Category</label>
          <Select {...form.register("category")}>
            <option value="snack">Snack</option>
            <option value="drink">Drink</option>
            <option value="combo">Combo</option>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          {...form.register("isAvailable")}
        />
        Available
      </label>
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu Items</CardTitle>
          <Button type="button" onClick={openCreate}>
            Create Menu Item
          </Button>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={menuQuery.data || []}
            isLoading={menuQuery.isPending}
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Menu Item" : "Create Menu Item"}
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
        title="Delete Menu Item"
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
