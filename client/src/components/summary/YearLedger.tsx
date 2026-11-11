import { cn, formatINR, formatINRCompact } from "@/lib/utils";
import type { SummaryYear, SummaryYearItem } from "@/lib/types";

function Cell({ value }: { value: number | null }) {
  if (value === null) {
    return <td className="px-3 py-2 text-center text-muted-foreground">–</td>;
  }
  const display = Math.abs(value) > 1000 ? formatINRCompact(value) : formatINR(value);
  return (
    <td className="px-3 py-2 text-right tabular-nums" title={formatINR(value)}>
      {display}
    </td>
  );
}

function ItemRow({ item }: { item: SummaryYearItem }) {
  return (
    <tr className="border-b border-border last:border-0">
      <th
        scope="row"
        className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm font-normal"
      >
        {item.name}
        {item.group && <span className="ml-1 text-xs text-muted-foreground">· {item.group}</span>}
      </th>
      {item.values.map((v, i) => <Cell key={i} value={v} />)}
      <Cell value={item.total} />
    </tr>
  );
}

function TotalRow({
  label,
  values,
  total,
}: {
  label: string;
  values: (number | null)[];
  total: number;
}) {
  return (
    <tr className="border-b-2 border-border font-semibold">
      <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-sm">
        {label}
      </th>
      {values.map((v, i) => <Cell key={i} value={v} />)}
      <Cell value={total} />
    </tr>
  );
}

export function YearLedger({
  data,
  onMonthClick,
}: {
  data: SummaryYear;
  onMonthClick: (month: number) => void;
}) {
  const fixedGrandTotal = data.fixed.reduce((s, i) => s + i.total, 0);
  const dailyGrandTotal = data.daily.reduce((s, i) => s + i.total, 0);
  const outGrandTotal = data.totals.out.reduce((s: number, v) => s + (v ?? 0), 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[800px] text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
            <th className="sticky left-0 z-10 bg-secondary/40 px-3 py-2 text-left font-medium">Item</th>
            {data.months.map((m) => (
              <th key={m.month} className="p-0 font-medium">
                <button
                  type="button"
                  onClick={() => onMonthClick(m.month)}
                  title={m.inProgress ? `${m.label} — in progress` : m.label}
                  className={cn(
                    "flex h-11 w-full min-w-[56px] items-center justify-center gap-0.5 hover:bg-secondary",
                    m.inProgress && "font-semibold text-foreground"
                  )}
                >
                  {m.label}
                  {m.inProgress && <span aria-hidden="true">*</span>}
                </button>
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium">Year total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={14}
              className="sticky left-0 bg-white px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Fixed expenses
            </td>
          </tr>
          {data.fixed.length === 0 ? (
            <tr>
              <td colSpan={14} className="px-3 py-4 text-center text-sm text-muted-foreground">
                No fixed expenses this year.
              </td>
            </tr>
          ) : (
            data.fixed.map((item) => <ItemRow key={item.id ?? item.name} item={item} />)
          )}
          <TotalRow label="Fixed total" values={data.totals.fixed} total={fixedGrandTotal} />

          <tr>
            <td
              colSpan={14}
              className="sticky left-0 bg-white px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Daily spending
            </td>
          </tr>
          {data.daily.length === 0 ? (
            <tr>
              <td colSpan={14} className="px-3 py-4 text-center text-sm text-muted-foreground">
                No spends this year.
              </td>
            </tr>
          ) : (
            data.daily.map((item) => <ItemRow key={item.id ?? item.name} item={item} />)
          )}
          <TotalRow label="Daily total" values={data.totals.daily} total={dailyGrandTotal} />

          <TotalRow label="Total out" values={data.totals.out} total={outGrandTotal} />
        </tbody>
      </table>
    </div>
  );
}
