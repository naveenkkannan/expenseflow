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
import { GroupSelect } from "@/components/expenses/GroupSelect";
import { useUpdateExpense } from "@/hooks/useExpenses";
import type { GridExpense } from "@/lib/types";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthValue(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 7);
}

export function EditExpenseDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: GridExpense | null;
}) {
  const [name, setName] = React.useState("");
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("");
  const [amountFrom, setAmountFrom] = React.useState(currentMonthValue());
  const [ongoing, setOngoing] = React.useState(true);
  const [stopAfter, setStopAfter] = React.useState(currentMonthValue());
  const updateExpense = useUpdateExpense();

  React.useEffect(() => {
    if (open && expense) {
      setName(expense.name);
      setGroupId(expense.groupId);
      setAmount(String(expense.currentAmount));
      setAmountFrom(currentMonthValue());
      setOngoing(!expense.activeTo);
      setStopAfter(toMonthValue(expense.activeTo) || currentMonthValue());
    }
  }, [open, expense]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expense) return;
    const parsedAmount = Number(amount);
    if (!name.trim() || !parsedAmount || parsedAmount <= 0) {
      toast.error("Fill in a name and a valid amount.");
      return;
    }
    try {
      await updateExpense.mutateAsync({
        id: expense.id,
        name: name.trim(),
        groupId,
        amount: parsedAmount,
        amountFrom: `${amountFrom}-01`,
        activeTo: ongoing ? null : `${stopAfter}-01`,
      });
      toast.success("Expense updated.");
      onOpenChange(false);
    } catch {
      toast.error("Could not update the expense.");
    }
  }

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-group">Group</Label>
            <GroupSelect id="edit-group" value={groupId} onChange={setGroupId} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount">Amount per month (₹)</Label>
            <Input
              id="edit-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-amount-from">New amount applies from</Label>
            <Input
              id="edit-amount-from"
              type="month"
              value={amountFrom}
              onChange={(e) => setAmountFrom(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Earlier months keep their current amount.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-stop-after">Stop after</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} />
                No end (ongoing)
              </label>
            </div>
            <Input
              id="edit-stop-after"
              type="month"
              value={stopAfter}
              onChange={(e) => setStopAfter(e.target.value)}
              disabled={ongoing}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateExpense.isPending}>
              {updateExpense.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
