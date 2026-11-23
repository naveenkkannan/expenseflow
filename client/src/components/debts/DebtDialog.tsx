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
import { useCreateDebt, useUpdateDebt } from "@/hooks/useDebts";
import { cn } from "@/lib/utils";
import type { Debt, DebtDirection } from "@/lib/types";

const DIRECTIONS: { value: DebtDirection; label: string }[] = [
  { value: "owed_to_me", label: "Owed to me" },
  { value: "i_owe", label: "I owe" },
];

export function DebtDialog({
  open,
  onOpenChange,
  debt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt?: Debt | null;
}) {
  const isEdit = !!debt;
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();

  const [personName, setPersonName] = React.useState("");
  const [direction, setDirection] = React.useState<DebtDirection>("owed_to_me");
  const [principal, setPrincipal] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (debt) {
      setPersonName(debt.personName);
      setDirection(debt.direction);
      setPrincipal(String(debt.principal));
      setDueDate(debt.dueDate ?? "");
      setNote(debt.note ?? "");
    } else {
      setPersonName("");
      setDirection("owed_to_me");
      setPrincipal("");
      setDueDate("");
      setNote("");
    }
  }, [open, debt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrincipal = Number(principal);
    if (!personName.trim() || !parsedPrincipal || parsedPrincipal <= 0) {
      toast.error("Fill in a name and a valid amount.");
      return;
    }
    try {
      if (isEdit) {
        await updateDebt.mutateAsync({
          id: debt!.id,
          personName: personName.trim(),
          direction,
          principal: parsedPrincipal,
          dueDate: dueDate || null,
          note: note || null,
        });
        toast.success("Debt updated.");
      } else {
        await createDebt.mutateAsync({
          personName: personName.trim(),
          direction,
          principal: parsedPrincipal,
          dueDate: dueDate || null,
          note: note || undefined,
        });
        toast.success("Debt added.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the debt.");
    }
  }

  const pending = createDebt.isPending || updateDebt.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit debt" : "Add debt"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="debt-person">Person</Label>
            <Input
              id="debt-person"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={direction === d.value}
                  onClick={() => setDirection(d.value)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-md border text-sm font-medium",
                    direction === d.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="debt-principal">Amount (₹)</Label>
            <Input
              id="debt-principal"
              type="number"
              min="0"
              step="0.01"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="debt-due">Due date</Label>
            <Input id="debt-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="debt-note">Note</Label>
            <Input id="debt-note" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
