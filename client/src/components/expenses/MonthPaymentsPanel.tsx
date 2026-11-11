import * as React from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentFormDialog } from "@/components/payments/PaymentFormDialog";
import { usePayments, useCreatePayment, useDeletePayment } from "@/hooks/useExpenses";
import { formatINR } from "@/lib/utils";
import type { GridExpense, Payment } from "@/lib/types";
import type { SelectedCell } from "@/components/expenses/MonthlyTracker";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MonthPaymentsPanel({
  cell,
  expense,
}: {
  cell: SelectedCell;
  expense: GridExpense;
}) {
  const [year, month] = cell.month.split("-").map(Number);
  const monthEntry = expense.months.find((m) => m.month === cell.month);
  const planned = monthEntry?.planned ?? 0;
  const status = monthEntry?.status ?? "to_pay";

  const { data: payments, isLoading } = usePayments(cell.expenseId, year, month);
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const [date, setDate] = React.useState(todayISO());
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [editingPayment, setEditingPayment] = React.useState<Payment | null>(null);

  const paid = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const pct = planned > 0 ? Math.min(100, Math.round((paid / planned) * 100)) : paid > 0 ? 100 : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!date || !parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a date and a valid amount.");
      return;
    }
    try {
      await createPayment.mutateAsync({ expenseId: cell.expenseId, paidOn: date, amount: parsedAmount, note: note || undefined });
      setAmount("");
      setNote("");
      toast.success("Payment logged.");
    } catch {
      toast.error("Could not log the payment.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await deletePayment.mutateAsync(id);
      toast.success("Payment deleted.");
    } catch {
      toast.error("Could not delete the payment.");
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-foreground text-base font-semibold">
              {cell.expenseName} — {MONTH_LABELS[month - 1]}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {formatINR(paid)} of {formatINR(planned)} paid · {formatINR(Math.max(planned - paid, 0))} left
            </p>
          </div>
          <StatusBadge status={status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : payments && payments.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {new Date(p.paidOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                    {p.note && <p className="truncate text-xs text-muted-foreground">{p.note}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatINR(p.amount)}</span>
                    <Button variant="ghost" size="icon" aria-label="Edit payment" className="h-11 w-11" onClick={() => setEditingPayment(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete payment"
                      className="h-11 w-11 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No payments logged for this month.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground text-base font-semibold">Add payment</CardTitle>
          <p className="text-xs text-muted-foreground">Log a payment. Several payments in a month add up.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Expense</Label>
              <Input value={cell.expenseName} disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-date">Date</Label>
              <Input id="panel-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-amount">Amount (₹)</Label>
              <Input
                id="panel-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder={String(planned || "")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="panel-note">Note</Label>
              <Input id="panel-note" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? "Saving…" : "Save payment"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setAmount(""); setNote(""); }}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <PaymentFormDialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
        expenses={[{ id: cell.expenseId, name: cell.expenseName }]}
        payment={editingPayment}
      />
    </div>
  );
}
