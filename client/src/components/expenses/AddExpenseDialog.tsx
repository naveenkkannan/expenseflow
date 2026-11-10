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
import { ColorPicker } from "@/components/expenses/ColorPicker";
import { useCreateExpense } from "@/hooks/useExpenses";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function AddExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = React.useState("");
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("");
  const [startMonth, setStartMonth] = React.useState(currentMonthValue());
  const [color, setColor] = React.useState("#3b82f6");
  const createExpense = useCreateExpense();

  React.useEffect(() => {
    if (open) {
      setName("");
      setGroupId(null);
      setAmount("");
      setStartMonth(currentMonthValue());
      setColor("#3b82f6");
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!name.trim() || !parsedAmount || parsedAmount <= 0) {
      toast.error("Fill in a name and a valid amount.");
      return;
    }
    try {
      await createExpense.mutateAsync({
        name: name.trim(),
        groupId,
        color,
        amount: parsedAmount,
        activeFrom: `${startMonth}-01`,
      });
      toast.success("Expense added.");
      onOpenChange(false);
    } catch {
      toast.error("Could not add the expense.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-name">Name</Label>
            <Input id="expense-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-group">Group</Label>
            <GroupSelect id="expense-group" value={groupId} onChange={setGroupId} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-amount">Amount per month (₹)</Label>
            <Input
              id="expense-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-start">Start month</Label>
            <Input
              id="expense-start"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Colour</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending ? "Adding…" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
