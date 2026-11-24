import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DebtRepaymentDialog } from "@/components/debts/DebtRepaymentDialog";
import { RowActionsMenu } from "@/components/shared/RowActionsMenu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDebtRepayments, useDeleteDebtRepayment } from "@/hooks/useDebts";
import { formatINR } from "@/lib/utils";
import type { Debt, DebtRepayment } from "@/lib/types";

export function DebtRepaymentsPanel({ debt }: { debt: Debt }) {
  const { data: repayments, isLoading } = useDebtRepayments(debt.id);
  const deleteRepayment = useDeleteDebtRepayment();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRepayment, setEditingRepayment] = React.useState<DebtRepayment | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DebtRepayment | null>(null);

  function openAdd() {
    setEditingRepayment(null);
    setDialogOpen(true);
  }

  function openEdit(r: DebtRepayment) {
    setEditingRepayment(r);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteRepayment.mutateAsync(deleteTarget.id);
      toast.success("Repayment deleted.");
    } catch {
      toast.error("Could not delete the repayment.");
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle>
            {debt.direction === "owed_to_me" ? "Repayments from" : "Repayments to"} {debt.personName}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {formatINR(debt.repaid)} of {formatINR(debt.principal)} · {formatINR(debt.remaining)} left
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Log repayment
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : repayments && repayments.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {repayments.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {new Date(r.paidOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  {r.note && <p className="truncate text-xs text-muted-foreground">{r.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatINR(r.amount)}</span>
                  <RowActionsMenu label="repayment" onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No repayments logged yet.</p>
        )}
      </CardContent>

      <DebtRepaymentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRepayment(null);
        }}
        debtId={debt.id}
        repayment={editingRepayment}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this repayment?"
        onConfirm={handleDelete}
      />
    </Card>
  );
}
