import * as React from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDeleteExpense } from "@/hooks/useExpenses";
import { formatINR } from "@/lib/utils";
import type { GridExpense } from "@/lib/types";

function formatMonthYear(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function activeSubtitle(e: GridExpense): string {
  if (e.ended) {
    return `Ended ${formatMonthYear(e.activeTo!)}`;
  }
  if (!e.activeTo) {
    return `${formatMonthYear(e.activeFrom)} – ongoing`;
  }
  const monthsLeft = e.monthsLeft ?? 0;
  return `${formatMonthYear(e.activeFrom)} – ${formatMonthYear(e.activeTo)} · ${monthsLeft} month${monthsLeft === 1 ? "" : "s"} left`;
}

export function ExpenseTable({
  expenses,
  onEdit,
}: {
  expenses: GridExpense[];
  onEdit: (expense: GridExpense) => void;
}) {
  const deleteExpense = useDeleteExpense();
  const [showEnded, setShowEnded] = React.useState(false);

  const activeExpenses = React.useMemo(() => expenses.filter((e) => !e.ended), [expenses]);
  const endedExpenses = React.useMemo(() => expenses.filter((e) => e.ended), [expenses]);

  const groups = React.useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: GridExpense[] }>();
    for (const e of activeExpenses) {
      const key = e.groupId ?? "__ungrouped__";
      if (!map.has(key)) {
        map.set(key, { key, label: e.groupName ?? "Other", items: [] });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values());
  }, [activeExpenses]);

  const totals = activeExpenses.reduce(
    (acc, e) => {
      acc.duePerMonth += e.currentAmount;
      acc.paidSoFar += e.paidSoFar;
      return acc;
    },
    { duePerMonth: 0, paidSoFar: 0 }
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

  function renderRow(e: GridExpense) {
    const pct = e.plannedYear > 0 ? Math.min(100, Math.round((e.paidYear / e.plannedYear) * 100)) : 0;
    return (
      <tr key={e.id} className="h-[60px] border-b border-border last:border-0">
        <td className="py-2 pr-4">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} aria-hidden="true" />
            <span>
              <span className="block font-medium">{e.name}</span>
              <span className="block text-xs text-muted-foreground">{activeSubtitle(e)}</span>
            </span>
          </span>
        </td>
        <td className="py-2 pr-4 text-right tabular-nums">
          {e.ended ? "—" : formatINR(e.currentAmount)}
        </td>
        <td className="py-2 pr-4">
          {e.ended ? (
            <span className="block text-right tabular-nums">{formatINR(e.paidYear)} paid</span>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="tabular-nums">
                {formatINR(e.paidYear)} of {formatINR(e.plannedYear)}
              </span>
              <span className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: e.color }}
                />
              </span>
            </div>
          )}
        </td>
        <td className="py-2 pl-4">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${e.name}`}
              className="h-11 w-11"
              onClick={() => onEdit(e)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${e.name}`}
              className="h-11 w-11 text-destructive hover:text-destructive"
              onClick={() => handleDelete(e)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No expenses yet. Add your first one.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Expense</th>
              <th className="py-2 pr-4 font-medium text-right">Per month</th>
              <th className="py-2 pr-4 font-medium text-right">Paid this year</th>
              <th className="py-2 pl-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupMonthly = group.items.reduce((sum, e) => sum + e.currentAmount, 0);
              return (
                <React.Fragment key={group.key}>
                  <tr>
                    <td
                      colSpan={3}
                      className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {group.label}
                    </td>
                    <td className="pb-1 pt-4 text-right text-xs font-semibold text-muted-foreground">
                      {formatINR(groupMonthly)}
                    </td>
                  </tr>
                  {group.items.map(renderRow)}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border font-semibold">
              <td className="py-3 pr-4">Due each month {formatINR(totals.duePerMonth)}</td>
              <td className="py-3 pr-4" />
              <td className="py-3 pr-4 text-right tabular-nums">{formatINR(totals.paidSoFar)} paid so far</td>
              <td className="py-3 pl-4" />
            </tr>
          </tfoot>
        </table>
      </div>

      {endedExpenses.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowEnded((v) => !v)}
            className="flex h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {showEnded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Show ended ({endedExpenses.length})
          </button>
          {showEnded && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>{endedExpenses.map(renderRow)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
