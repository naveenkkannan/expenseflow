import type { ThisMonthEntry } from "@/lib/types";

export function ShareBar({ entries }: { entries: ThisMonthEntry[] }) {
  if (entries.length === 0) {
    return <div className="h-3 w-full rounded-full bg-muted" />;
  }

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Share of this month's spending by expense">
      {entries.map((e) => (
        <div
          key={e.expenseId}
          style={{ width: `${Math.max(e.sharePct, 1)}%`, backgroundColor: e.color }}
          title={`${e.name}: ${e.sharePct}%`}
        />
      ))}
    </div>
  );
}
