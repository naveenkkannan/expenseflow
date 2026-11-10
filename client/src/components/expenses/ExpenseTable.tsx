import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeleteExpense } from "@/hooks/useExpenses";
import { formatINR } from "@/lib/utils";
import type { GridExpense } from "@/lib/types";

function formatActiveRange(activeFrom: string, activeTo: string | null): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short" });
  return `${fmt(activeFrom)} – ${activeTo ? fmt(activeTo) : "ongoing"}`;
}

export function ExpenseTable({
  expenses,
  onEdit,
}: {
  expenses: GridExpense[];
  onEdit: (expense: GridExpense) => void;
}) {
  const deleteExpense = useDeleteExpense();

  const groups = React.useMemo(() => {
    const map = new Map<string, { label: string; items: GridExpense[] }>();
    for (const e of expenses) {
      const key = e.groupId ?? "__ungrouped__";
      if (!map.has(key)) {
        map.set(key, { label: e.groupName ?? "Ungrouped", items: [] });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values());
  }, [expenses]);

  const totals = expenses.reduce(
    (acc, e) => {
      acc.perMonth += e.currentAmount;
      acc.perYear += e.currentAmount * 12;
      acc.paidSoFar += e.paidSoFar;
      return acc;
    },
    { perMonth: 0, perYear: 0, paidSoFar: 0 }
  );

  async function handleDelete(e: GridExpense) {
    if (!window.confirm(`Delete "${e.name}"? This also deletes its payment history.`)) return;
    try {
      await deleteExpense.mutateAsync(e.id);
      toast.success("Expense deleted.");
    } catch {
      toast.error("Could not delete the expense.");
    }
  }

  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No expenses yet. Add your first one.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Expense</th>
            <th className="py-2 pr-4 font-medium text-right">Per month</th>
            <th className="py-2 pr-4 font-medium text-right">Per year</th>
            <th className="py-2 pr-4 font-medium">Active</th>
            <th className="py-2 pr-4 font-medium text-right">Paid so far</th>
            <th className="py-2 pl-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <React.Fragment key={group.label}>
              <tr>
                <td colSpan={6} className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </td>
              </tr>
              {group.items.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} aria-hidden="true" />
                      {e.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatINR(e.currentAmount)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatINR(e.currentAmount * 12)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                    {formatActiveRange(e.activeFrom, e.activeTo)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{formatINR(e.paidSoFar)}</td>
                  <td className="py-3 pl-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${e.name}`}
                        className="h-9 w-9"
                        onClick={() => onEdit(e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${e.name}`}
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-3 pr-4">Total</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatINR(totals.perMonth)}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{formatINR(totals.perYear)}</td>
            <td className="py-3 pr-4" />
            <td className="py-3 pr-4 text-right tabular-nums">{formatINR(totals.paidSoFar)}</td>
            <td className="py-3 pl-4" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
