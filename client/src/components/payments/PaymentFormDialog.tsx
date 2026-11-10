import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreatePayment, useUpdatePayment } from "@/hooks/useExpenses";
import type { GridExpense, Payment } from "@/lib/types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  expenses,
  defaultExpenseId,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenses: Pick<GridExpense, "id" | "name">[];
  defaultExpenseId?: string;
  payment?: Payment | null;
}) {
  const isEdit = !!payment;
  const [expenseId, setExpenseId] = React.useState(payment?.expenseId ?? defaultExpenseId ?? "");
  const [paidOn, setPaidOn] = React.useState(payment?.paidOn ?? todayISO());
  const [amount, setAmount] = React.useState(payment ? String(payment.amount) : "");
  const [note, setNote] = React.useState(payment?.note ?? "");

  React.useEffect(() => {
    if (open) {
      setExpenseId(payment?.expenseId ?? defaultExpenseId ?? expenses[0]?.id ?? "");
      setPaidOn(payment?.paidOn ?? todayISO());
      setAmount(payment ? String(payment.amount) : "");
      setNote(payment?.note ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment, defaultExpenseId]);

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const isPending = createPayment.isPending || updatePayment.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!expenseId || !paidOn || !parsedAmount || parsedAmount <= 0) {
      toast.error("Fill in expense, date and a valid amount.");
      return;
    }

    try {
      if (isEdit && payment) {
        await updatePayment.mutateAsync({ id: payment.id, paidOn, amount: parsedAmount, note: note || null });
        toast.success("Payment updated.");
      } else {
        await createPayment.mutateAsync({ expenseId, paidOn, amount: parsedAmount, note: note || undefined });
        toast.success("Payment logged.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the payment.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit payment" : "Add payment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-expense">Expense</Label>
            <Select value={expenseId} onValueChange={setExpenseId} disabled={isEdit}>
              <SelectTrigger id="payment-expense">
                <SelectValue placeholder="Choose an expense" />
              </SelectTrigger>
              <SelectContent>
                {expenses.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-date">Date</Label>
            <Input id="payment-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Amount (₹)</Label>
            <Input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-note">Note</Label>
            <Input
              id="payment-note"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
