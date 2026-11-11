import * as React from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateSpend, useSpendSuggestions, useSpendTags } from "@/hooks/useDaily";
import { formatINR, todayISO, cn } from "@/lib/utils";
import type { PaymentMethod, SpendSuggestion } from "@/lib/types";

const NONE_VALUE = "__none__";

export function QuickAddBar({
  lastPaymentMethod,
  onOpenFullSheet,
}: {
  lastPaymentMethod: PaymentMethod | null;
  onOpenFullSheet: (prefill: { amount?: string; tagId?: string | null; paymentMethod?: PaymentMethod }) => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [tagId, setTagId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const createSpend = useCreateSpend();
  const { data: suggestions } = useSpendSuggestions();
  const { data: tags } = useSpendTags();

  function applySuggestion(s: SpendSuggestion) {
    setAmount(String(s.amount));
    setTagId(s.tagId);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter an amount.");
      return;
    }
    setError(null);
    try {
      await createSpend.mutateAsync({
        spentOn: todayISO(),
        amount: parsedAmount,
        tagId,
        paymentMethod: lastPaymentMethod ?? "upi",
      });
      setAmount("");
      toast.success("Spend logged.");
    } catch {
      toast.error("Could not log the spend.");
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-white px-3 pt-2 pb-2 md:hidden">
      {suggestions && suggestions.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applySuggestion(s)}
              className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-input px-3 text-xs font-medium text-muted-foreground"
            >
              {s.label} {formatINR(s.amount)}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₹
          </span>
          <Input
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            className={cn("pl-7 text-base", error && "border-destructive")}
            aria-label="Amount"
            aria-invalid={!!error}
          />
        </div>
        <Select value={tagId ?? NONE_VALUE} onValueChange={(v) => setTagId(v === NONE_VALUE ? null : v)}>
          <SelectTrigger className="w-28 shrink-0" aria-label="Tag">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>No tag</SelectItem>
            {tags?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="More spend options"
          className="h-11 w-11 shrink-0"
          onClick={() => onOpenFullSheet({ amount, tagId })}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <Button type="submit" className="shrink-0" disabled={createSpend.isPending}>
          Add
        </Button>
      </form>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

