import * as React from "react";
import { cn, formatINR, formatINRCompact, todayISO } from "@/lib/utils";
import type { DailyMonth, SpendEntry } from "@/lib/types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const METHOD_LABELS: Record<string, string> = { upi: "UPI", card: "Card", cash: "Cash" };

function mondayFirstOffset(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function quartileBucket(amount: number, sorted: number[]): number {
  if (sorted.length === 0 || amount <= 0) return 0;
  const index = sorted.indexOf(amount);
  const pct = index / Math.max(sorted.length - 1, 1);
  if (pct < 0.25) return 1;
  if (pct < 0.5) return 2;
  if (pct < 0.75) return 3;
  return 4;
}

const BUCKET_CLASSES = ["bg-muted", "bg-primary/15", "bg-primary/35", "bg-primary/55", "bg-primary/80 text-primary-foreground"];

export function DailyCalendar({
  data,
  onEditSpend,
}: {
  data: DailyMonth;
  onEditSpend: (entry: SpendEntry, date: string) => void;
}) {
  const today = todayISO();
  const [selectedDate, setSelectedDate] = React.useState<string | null>(
    data.calendar.find((d) => d.date.slice(0, 10) === today) ? today : null
  );

  const sortedAmounts = React.useMemo(
    () => data.calendar.filter((d) => d.total > 0 && d.date.slice(0, 10) <= today).map((d) => d.total).sort((a, b) => a - b),
    [data.calendar, today]
  );

  const offset = data.calendar.length > 0 ? mondayFirstOffset(new Date(data.calendar[0].date)) : 0;

  const selectedDay = selectedDate ? data.days.find((d) => d.date.slice(0, 10) === selectedDate) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {data.calendar.map((day) => {
          const dateOnly = day.date.slice(0, 10);
          const isFuture = dateOnly > today;
          const isToday = dateOnly === today;
          const bucket = quartileBucket(day.total, sortedAmounts);
          const dayNum = new Date(day.date).getDate();

          if (isFuture) {
            return (
              <div
                key={day.date}
                className="flex aspect-square flex-col items-center justify-center rounded-md text-xs text-muted-foreground/50"
              >
                {dayNum}
              </div>
            );
          }

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(dateOnly)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors",
                BUCKET_CLASSES[bucket],
                isToday && "ring-2 ring-ring",
                selectedDate === dateOnly && "outline outline-2 outline-offset-1 outline-foreground"
              )}
            >
              <span className="font-medium">{dayNum}</span>
              <span>{day.total > 0 ? formatINRCompact(day.total) : "–"}</span>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>{new Date(selectedDay.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</span>
            <span className="tabular-nums">{formatINR(selectedDay.total)}</span>
          </div>
          <ul className="flex flex-col gap-1">
            {selectedDay.entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onEditSpend(entry, selectedDay.date)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{entry.note || entry.tagName}</span>
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
      )}
    </div>
  );
}
