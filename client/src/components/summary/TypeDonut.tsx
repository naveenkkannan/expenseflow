import { formatINR } from "@/lib/utils";
import type { ExpenseType, TypeSummary } from "@/lib/types";

const TYPE_COLORS: Record<ExpenseType, string> = {
  need: "#2563eb",
  want: "#d97706",
  investment: "#16a34a",
};

const TYPE_LABELS: Record<ExpenseType, string> = {
  need: "Needs",
  want: "Wants",
  investment: "Investments",
};

function shadeFor(index: number): number {
  if (index === 0) return 1;
  if (index === 1) return 0.82;
  if (index === 2) return 0.64;
  return 0.45;
}

interface Segment {
  startDeg: number;
  angleDeg: number;
  color: string;
  opacity: number;
  key: string;
}

function computeSegments(
  values: number[],
  windowStart: number,
  windowAngle: number,
  gapDeg: number
): { startDeg: number; angleDeg: number }[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0 || values.length === 0) return values.map(() => ({ startDeg: windowStart, angleDeg: 0 }));
  const gaps = values.length > 1 ? gapDeg * values.length : 0;
  const available = Math.max(windowAngle - gaps, 0);
  let cursor = windowStart;
  return values.map((v) => {
    const angleDeg = (v / total) * available;
    const seg = { startDeg: cursor, angleDeg };
    cursor += angleDeg + (values.length > 1 ? gapDeg : 0);
    return seg;
  });
}

function Ring({ segments, radius, strokeWidth, cx, cy }: { segments: Segment[]; radius: number; strokeWidth: number; cx: number; cy: number }) {
  const circumference = 2 * Math.PI * radius;
  return (
    <>
      {segments.map((s) => {
        if (s.angleDeg <= 0) return null;
        const arcLen = circumference * (s.angleDeg / 360);
        const offset = -(circumference * (s.startDeg / 360));
        return (
          <circle
            key={s.key}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeOpacity={s.opacity}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLen} ${circumference - arcLen}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
      })}
    </>
  );
}

export function TypeDonut({ data }: { data: TypeSummary }) {
  if (data.types.length === 0 || data.total <= 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No spends or payments in this period.</p>;
  }

  const cx = 100;
  const cy = 100;
  const innerRadius = 55;
  const innerStrokeWidth = 36;
  const outerRadius = 90;
  const outerStrokeWidth = 18;

  const typeWindows = computeSegments(
    data.types.map((t) => t.amount),
    0,
    360,
    data.types.length > 1 ? 3 : 0
  );

  const innerSegments: Segment[] = data.types.map((t, i) => ({
    ...typeWindows[i],
    color: TYPE_COLORS[t.type],
    opacity: 1,
    key: t.type,
  }));

  const outerSegments: Segment[] = data.types.flatMap((t, i) => {
    const window = typeWindows[i];
    const itemWindows = computeSegments(
      t.items.map((it) => it.amount),
      window.startDeg,
      window.angleDeg,
      t.items.length > 1 ? 1.5 : 0
    );
    return t.items.map((item, j) => ({
      ...itemWindows[j],
      color: TYPE_COLORS[t.type],
      opacity: shadeFor(j),
      key: `${t.type}-${item.kind}-${item.id ?? "untagged"}`,
    }));
  });

  const ariaLabel = `${data.types
    .map((t) => `${TYPE_LABELS[t.type]} ${t.pct}%`)
    .join(", ")} of ${formatINR(data.total)} total out`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="relative mx-auto h-[220px] w-[220px] shrink-0">
        <svg viewBox="0 0 200 200" width="220" height="220" role="img" aria-label={ariaLabel}>
          <Ring segments={innerSegments} radius={innerRadius} strokeWidth={innerStrokeWidth} cx={cx} cy={cy} />
          <Ring segments={outerSegments} radius={outerRadius} strokeWidth={outerStrokeWidth} cx={cx} cy={cy} />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-muted-foreground">Total out</p>
          <p className="text-lg font-semibold tabular-nums">{formatINR(data.total)}</p>
        </div>
      </div>

      <div className="flex-1">
        <ul className="flex flex-col gap-4">
          {data.types.map((t) => (
            <li key={t.type}>
              <div
                className="flex items-center justify-between gap-2 border-t-2 pt-1.5"
                style={{ borderTopColor: TYPE_COLORS[t.type] }}
              >
                <span className="text-sm font-semibold">{TYPE_LABELS[t.type]}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatINR(t.amount)} <span className="text-xs font-normal text-muted-foreground">({t.pct}%)</span>
                </span>
              </div>
              <ul className="mt-1 flex flex-col gap-1">
                {t.items.map((item, j) => (
                  <li
                    key={`${item.kind}-${item.id ?? "untagged"}`}
                    className="flex items-center justify-between gap-2 py-0.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[t.type], opacity: shadeFor(j) }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatINR(item.amount)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
