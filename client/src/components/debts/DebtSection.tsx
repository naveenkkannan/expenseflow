import * as React from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeleteDebt } from "@/hooks/useDebts";
import { cn, formatINR } from "@/lib/utils";
import type { Debt } from "@/lib/types";

export function DebtSection({
  title,
  subtitle,
  debts,
  selectedDebtId,
  onSelect,
  onEdit,
}: {
  title: string;
  subtitle: string;
  debts: Debt[];
  selectedDebtId: string | null;
  onSelect: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
}) {
  const deleteDebt = useDeleteDebt();
  const [showSettled, setShowSettled] = React.useState(false);

  const open = debts.filter((d) => d.status === "open");
  const settled = debts.filter((d) => d.status === "settled");

  async function handleDelete(debt: Debt) {
    if (!window.confirm(`Delete the debt with ${debt.personName}? This also deletes its repayment history.`)) return;
    try {
      await deleteDebt.mutateAsync(debt.id);
      toast.success("Debt deleted.");
    } catch {
      toast.error("Could not delete the debt.");
    }
  }

  function renderRow(debt: Debt) {
    const pct = debt.principal > 0 ? Math.min(100, Math.round((debt.repaid / debt.principal) * 100)) : 0;
    const isSelected = selectedDebtId === debt.id;
    return (
      <li key={debt.id} className={cn("rounded-md border border-border px-3 py-2.5", isSelected && "border-primary")}>
        <button type="button" onClick={() => onSelect(debt)} className="flex w-full flex-col gap-1.5 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{debt.personName}</span>
            <span className="shrink-0 tabular-nums font-medium">{formatINR(debt.remaining)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {debt.status === "settled" ? (
                <Badge variant="success">Settled</Badge>
              ) : (
                <Badge variant="secondary">Open</Badge>
              )}
              {debt.dueDate && (
                <span className="ml-2">
                  Due {new Date(debt.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </span>
            <span>
              {formatINR(debt.repaid)} of {formatINR(debt.principal)}
            </span>
          </div>
          {debt.principal > 0 && (
            <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", debt.status === "settled" ? "bg-green-500" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </span>
          )}
        </button>
        <div className="mt-1.5 flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit debt with ${debt.personName}`}
            className="h-11 w-11"
            onClick={() => onEdit(debt)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete debt with ${debt.personName}`}
            className="h-11 w-11 text-destructive hover:text-destructive"
            onClick={() => handleDelete(debt)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </li>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing open here.</p>
        ) : (
          <ul className="flex flex-col gap-2">{open.map(renderRow)}</ul>
        )}

        {settled.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowSettled((v) => !v)}
              className="flex h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showSettled ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Show settled ({settled.length})
            </button>
            {showSettled && <ul className="flex flex-col gap-2">{settled.map(renderRow)}</ul>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
