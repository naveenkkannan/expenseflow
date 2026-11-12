import { cn } from "@/lib/utils";
import type { ExpenseType } from "@/lib/types";

const OPTIONS: { value: ExpenseType; label: string }[] = [
  { value: "need", label: "Need" },
  { value: "want", label: "Want" },
  { value: "investment", label: "Investment" },
];

export function TypeSegmented({
  value,
  onChange,
  id,
}: {
  value: ExpenseType;
  onChange: (type: ExpenseType) => void;
  id?: string;
}) {
  return (
    <div id={id} className="grid grid-cols-3 gap-2" role="group" aria-label="Type">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex h-11 items-center justify-center rounded-md border text-sm font-medium",
            value === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
