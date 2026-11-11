import { cn, formatINR, todayISO } from "@/lib/utils";
import type { DailyMonth, SpendEntry } from "@/lib/types";

const METHOD_LABELS: Record<string, string> = { upi: "UPI", card: "Card", cash: "Cash" };

function formatDayHeading(date: string): string {
  const d = new Date(date);
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const dayMonth = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return date.slice(0, 10) === todayISO() ? `Today · ${weekday} ${dayMonth}` : `${weekday} ${dayMonth}`;
}

export function DailyList({
  data,
  selectedTagId,
  onSelectTag,
  onEditSpend,
}: {
  data: DailyMonth;
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
  onEditSpend: (entry: SpendEntry, date: string) => void;
}) {
  const total = data.byTag.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      {total > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {data.byTag.map((t) => (
              <span
                key={t.tagId ?? "untagged"}
                style={{ width: `${(t.amount / total) * 100}%`, backgroundColor: t.color }}
                title={`${t.name}: ${formatINR(t.amount)}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {data.byTag.map((t) => (
              <div key={t.tagId ?? "untagged"} className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                <span className="truncate text-muted-foreground">{t.name}</span>
                <span className="ml-auto shrink-0 font-medium tabular-nums">{formatINR(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onSelectTag(null)}
          className={cn(
            "flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-xs font-medium",
            selectedTagId === null ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
          )}
        >
          All
        </button>
        {data.byTag.map((t) => (
          <button
            key={t.tagId ?? "untagged"}
            type="button"
            onClick={() => onSelectTag(t.tagId)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium",
              selectedTagId === t.tagId ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground"
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
            {t.name}
          </button>
        ))}
      </div>

      {data.days.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No spending logged for this month.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {data.days.map((day) => (
            <div key={day.date}>
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>{formatDayHeading(day.date)}</span>
                <span className="tabular-nums">{formatINR(day.total)}</span>
              </div>
              <ul className="flex flex-col gap-1">
                {day.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onEditSpend(entry, day.date)}
                      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-secondary"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {entry.note || entry.tagName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {entry.tagName} · {METHOD_LABELS[entry.paymentMethod]}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">{formatINR(entry.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
