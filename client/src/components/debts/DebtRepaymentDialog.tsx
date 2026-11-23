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
import { useCreateDebtRepayment, useUpdateDebtRepayment } from "@/hooks/useDebts";
import { todayISO } from "@/lib/utils";
import type { DebtRepayment } from "@/lib/types";

export function DebtRepaymentDialog({
  open,
  onOpenChange,
  debtId,
  repayment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: string | null;
  repayment?: DebtRepayment | null;
}) {
  const isEdit = !!repayment;
  const createRepayment = useCreateDebtRepayment();
  const updateRepayment = useUpdateDebtRepayment();

  const [paidOn, setPaidOn] = React.useState(todayISO());
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (repayment) {
      setPaidOn(repayment.paidOn);
      setAmount(String(repayment.amount));
      setNote(repayment.note ?? "");
    } else {
      setPaidOn(todayISO());
      setAmount("");
      setNote("");
    }
  }, [open, repayment]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!paidOn || !parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a date and a valid amount.");
      return;
    }
    try {
      if (isEdit) {
        await updateRepayment.mutateAsync({ id: repayment!.id, paidOn, amount: parsedAmount, note: note || null });
        toast.success("Repayment updated.");
      } else {
        if (!debtId) return;
        await createRepayment.mutateAsync({ debtId, paidOn, amount: parsedAmount, note: note || undefined });
        toast.success("Repayment logged.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the repayment.");
    }
  }

  const pending = createRepayment.isPending || updateRepayment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit repayment" : "Log repayment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repayment-date">Date</Label>
            <Input id="repayment-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repayment-amount">Amount (₹)</Label>
            <Input
              id="repayment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="repayment-note">Note</Label>
            <Input id="repayment-note" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
