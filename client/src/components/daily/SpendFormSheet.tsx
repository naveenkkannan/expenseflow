import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/expenses/ColorPicker";
import { useSpendTags, useCreateSpendTag, useCreateSpend, useUpdateSpend, useDeleteSpend } from "@/hooks/useDaily";
import { cn, todayISO } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
];

export interface SpendFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spend?: {
    id: string;
    spentOn: string;
    amount: number;
    tagId: string | null;
    paymentMethod: PaymentMethod;
    note: string | null;
  } | null;
  initialAmount?: string;
  initialTagId?: string | null;
  initialPaymentMethod?: PaymentMethod;
}

export function SpendFormSheet({
  open,
  onOpenChange,
  spend,
  initialAmount,
  initialTagId,
  initialPaymentMethod,
}: SpendFormSheetProps) {
  const { data: tags } = useSpendTags();
  const createTag = useCreateSpendTag();
  const createSpend = useCreateSpend();
  const updateSpend = useUpdateSpend();
  const deleteSpend = useDeleteSpend();

  const isEdit = !!spend;

  const [amount, setAmount] = React.useState("");
  const [spentOn, setSpentOn] = React.useState(todayISO());
  const [tagId, setTagId] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("upi");
  const [note, setNote] = React.useState("");
  const [creatingTag, setCreatingTag] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState("");
  const [newTagColor, setNewTagColor] = React.useState("#3b82f6");

  React.useEffect(() => {
    if (!open) return;
    if (spend) {
      setAmount(String(spend.amount));
      setSpentOn(spend.spentOn);
      setTagId(spend.tagId);
      setPaymentMethod(spend.paymentMethod);
      setNote(spend.note ?? "");
    } else {
      setAmount(initialAmount ?? "");
      setSpentOn(todayISO());
      setTagId(initialTagId ?? null);
      setPaymentMethod(initialPaymentMethod ?? "upi");
      setNote("");
    }
    setCreatingTag(false);
    setNewTagName("");
  }, [open, spend, initialAmount, initialTagId, initialPaymentMethod]);

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
      setTagId((tag as { id: string }).id);
      setCreatingTag(false);
      setNewTagName("");
    } catch {
      toast.error("Could not add the tag.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!spentOn || !parsedAmount || parsedAmount <= 0) {
      toast.error("Enter a date and a valid amount.");
      return;
    }
    try {
      if (isEdit) {
        await updateSpend.mutateAsync({
          id: spend!.id,
          spentOn,
          amount: parsedAmount,
          tagId,
          paymentMethod,
          note: note || null,
        });
        toast.success("Spend updated.");
      } else {
        await createSpend.mutateAsync({
          spentOn,
          amount: parsedAmount,
          tagId,
          paymentMethod,
          note: note || undefined,
        });
        toast.success("Spend logged.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the spend.");
    }
  }

  async function handleDelete() {
    if (!spend) return;
    if (!window.confirm("Delete this spend?")) return;
    try {
      await deleteSpend.mutateAsync(spend.id);
      toast.success("Spend deleted.");
      onOpenChange(false);
    } catch {
      toast.error("Could not delete the spend.");
    }
  }

  const pending = createSpend.isPending || updateSpend.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit spend" : "Add spend"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spend-amount">Amount (₹)</Label>
            <Input
              id="spend-amount"
              type="number"
              inputMode="numeric"
              min="0"
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-14 text-2xl font-semibold"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spend-date">Date</Label>
            <Input
              id="spend-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="text-base"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tag</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTagId(null)}
                className={cn(
                  "flex h-9 items-center rounded-full border px-3 text-sm font-medium",
                  tagId === null ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
                )}
              >
                Untagged
              </button>
              {tags?.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTagId(t.id)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
                    tagId === t.id ? "border-primary bg-primary/10" : "border-input text-muted-foreground"
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                  {t.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCreatingTag((v) => !v)}
                className="flex h-9 items-center gap-1 rounded-full border border-dashed border-input px-3 text-sm font-medium text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> New tag
              </button>
            </div>
            {creatingTag && (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Tag name"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    autoFocus
                  />
                  <Button type="button" onClick={handleCreateTag} disabled={createTag.isPending}>
                    Add
                  </Button>
                </div>
                <ColorPicker value={newTagColor} onChange={setNewTagColor} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Paid with</Label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={paymentMethod === m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-md border text-sm font-medium",
                    paymentMethod === m.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spend-note">Note</Label>
            <Input
              id="spend-note"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-base"
            />
          </div>

          <SheetFooter>
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive sm:mr-auto"
                onClick={handleDelete}
                disabled={deleteSpend.isPending}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
