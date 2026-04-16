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
  createPricingRule,
  deletePricingRule,
  getPricingRules,
  updatePricingRule,
} from "../features/admin/api";
import EntityDialog from "../features/admin/components/EntityDialog";
import AdminTable from "../features/admin/components/AdminTable";
import { handleAdminMutationError } from "../features/admin/errorHandlers";
import { toastSuccess } from "../lib/toast";

const pricingSchema = z.object({
  screenType: z.enum(["regular", "imax", "threeD", "fourDx"]),
  seatType: z.enum(["normal", "premium", "vip", "wheelchair"]),
  dayType: z.enum(["weekday", "weekend", "holiday"]),
  basePrice: z.coerce.number().positive("Price must be positive"),
});

export default function AdminPricingRulesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const pricingQuery = useQuery({
    queryKey: ["admin-pricing-rules"],
    queryFn: getPricingRules,
  });

  const form = useForm({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      screenType: "regular",
      seatType: "normal",
      dayType: "weekday",
      basePrice: 1,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values) =>
      editing
        ? updatePricingRule(editing.id, values)
        : createPricingRule(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-pricing-rules"],
      });
      toastSuccess(editing ? "Pricing rule updated" : "Pricing rule created");
      setOpen(false);
      setEditing(null);
      form.reset({
        screenType: "regular",
        seatType: "normal",
        dayType: "weekday",
        basePrice: 1,
      });
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        conflictMessage: "Pricing rule already exists",
        fallbackMessage: "Failed to save pricing rule",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (row) => deletePricingRule(row.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-pricing-rules"],
      });
      toastSuccess("Pricing rule deleted");
      setDeleteTarget(null);
    },
    onError: (err) =>
      handleAdminMutationError(err, {
        fallbackMessage: "Failed to delete pricing rule",
      }),
  });

  const columns = useMemo(
    () => [
      { key: "screenType", label: "Screen Type" },
      { key: "seatType", label: "Seat Type" },
      { key: "dayType", label: "Day Type" },
      {
        key: "basePrice",
        label: "Price",
        render: (row) => `$${Number(row.basePrice || 0).toFixed(2)}`,
      },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    form.reset({
      screenType: "regular",
      seatType: "normal",
      dayType: "weekday",
      basePrice: 1,
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.reset({
      screenType: row.screenType,
      seatType: row.seatType,
      dayType: row.dayType,
      basePrice: Number(row.basePrice || 1),
    });
    setOpen(true);
  };

  const submit = form.handleSubmit((values) => saveMutation.mutate(values));

  const formBody = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Screen Type</label>
          <Select {...form.register("screenType")}>
            <option value="regular">regular</option>
            <option value="imax">imax</option>
            <option value="threeD">threeD</option>
            <option value="fourDx">fourDx</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Seat Type</label>
          <Select {...form.register("seatType")}>
            <option value="normal">normal</option>
            <option value="premium">premium</option>
            <option value="vip">vip</option>
            <option value="wheelchair">wheelchair</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Day Type</label>
          <Select {...form.register("dayType")}>
            <option value="weekday">weekday</option>
            <option value="weekend">weekend</option>
            <option value="holiday">holiday</option>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Price</label>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          {...form.register("basePrice")}
        />
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pricing Rules</CardTitle>
          <Button type="button" onClick={openCreate}>
            Create Pricing Rule
          </Button>
        </CardHeader>
        <CardContent>
          <AdminTable
            columns={columns}
            data={pricingQuery.data || []}
            isLoading={pricingQuery.isPending}
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
          />
        </CardContent>
      </Card>

      <EntityDialog
        open={open}
        onClose={setOpen}
        title={editing ? "Edit Pricing Rule" : "Create Pricing Rule"}
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
        title="Delete Pricing Rule"
        description="Delete requires confirmation."
        form={<p className="text-sm">Delete this pricing rule?</p>}
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
