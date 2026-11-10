import { cn } from "@/lib/utils";
import { statusLabel } from "@/components/ui/status-badge";
import type { GridExpense } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const STATUS_CELL_CLASS: Record<string, string> = {
  paid: "bg-green-50 text-green-800",
  partial: "bg-amber-50 text-amber-800",
  missed: "bg-red-50 text-red-800",
  to_pay: "bg-secondary text-secondary-foreground",
  upcoming: "bg-white text-muted-foreground",
  not_active: "bg-white text-muted-foreground/60",
};

export interface SelectedCell {
  expenseId: string;
  expenseName: string;
  month: string;
}

export function MonthlyTracker({
  expenses,
  selected,
  onSelect,
}: {
  expenses: GridExpense[];
  selected: SelectedCell | null;
  onSelect: (cell: SelectedCell) => void;
}) {
  if (expenses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No expenses to track yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white py-2 pr-4 text-left text-xs font-medium text-muted-foreground">
              Expense
            </th>
            {MONTH_LABELS.map((m) => (
              <th key={m} className="min-w-[72px] px-1 py-2 text-center text-xs font-medium text-muted-foreground">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="sticky left-0 z-10 bg-white py-1 pr-4 text-left">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} aria-hidden="true" />
                  <span className="whitespace-nowrap">{e.name}</span>
                </span>
              </td>
              {e.months.map((m) => {
                const isSelected = selected?.expenseId === e.id && selected.month === m.month;
                const isInactive = m.status === "not_active";
                return (
                  <td key={m.month} className="p-1">
                    <button
                      type="button"
                      disabled={isInactive}
                      onClick={() => onSelect({ expenseId: e.id, expenseName: e.name, month: m.month })}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex min-h-11 w-full flex-col items-center justify-center rounded-md px-1 py-1.5 text-xs transition-colors",
                        STATUS_CELL_CLASS[m.status],
                        isInactive ? "cursor-default" : "cursor-pointer hover:brightness-95",
                        isSelected && "ring-2 ring-ring"
                      )}
                    >
                      <span className="font-medium tabular-nums">{isInactive ? "–" : m.paid.toLocaleString("en-IN")}</span>
                      {!isInactive && <span className="mt-0.5 text-[10px]">{statusLabel(m.status)}</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
