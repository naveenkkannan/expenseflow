import { toCsv } from "./csv.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface YearSummaryRow {
  kind: "fixed" | "daily";
  item_id: string | null;
  item_name: string;
  group_name: string | null;
  month: number;
  planned: string | null;
  paid: string;
  spend_count: number | null;
}

export interface YearItem {
  id: string | null;
  name: string;
  group: string | null;
  values: (number | null)[];
  total: number;
}

export interface YearSummary {
  year: number;
  months: { month: number; label: string; inProgress: boolean }[];
  fixed: YearItem[];
  daily: YearItem[];
  totals: { fixed: (number | null)[]; daily: (number | null)[]; out: (number | null)[] };
  currentMonth: number | null;
}

function sumColumn(items: { values: (number | null)[] }[], m: number): number | null {
  let any = false;
  let sum = 0;
  for (const item of items) {
    if (item.values[m] !== null) {
      any = true;
      sum += item.values[m]!;
    }
  }
  return any ? sum : null;
}

export function buildYearSummary(
  rows: YearSummaryRow[],
  year: number,
  currentYear: number,
  currentMonth: number
): YearSummary {
  type Draft = { id: string | null; name: string; group: string | null; values: (number | null)[] };
  const fixedMap = new Map<string, Draft>();
  const dailyMap = new Map<string, Draft>();

  for (const r of rows) {
    const map = r.kind === "fixed" ? fixedMap : dailyMap;
    const key = r.item_id ?? "__untagged__";
    if (!map.has(key)) {
      map.set(key, { id: r.item_id, name: r.item_name, group: r.group_name, values: Array(12).fill(null) });
    }
    map.get(key)!.values[r.month - 1] = Number(r.paid);
  }

  const isFutureMonth = (m: number) => year > currentYear || (year === currentYear && m + 1 > currentMonth);

  function finalize(map: Map<string, Draft>): YearItem[] {
    return Array.from(map.values()).map((draft) => {
      const values = draft.values.map((v, m) => (isFutureMonth(m) ? null : v));
      return { ...draft, values, total: values.reduce((sum: number, v) => sum + (v ?? 0), 0) };
    });
  }

  const fixed = finalize(fixedMap).sort((a, b) => a.name.localeCompare(b.name));
  const daily = finalize(dailyMap).sort((a, b) => b.total - a.total);

  const totalsFixed = Array.from({ length: 12 }, (_, m) => sumColumn(fixed, m));
  const totalsDaily = Array.from({ length: 12 }, (_, m) => sumColumn(daily, m));
  const totalsOut = totalsFixed.map((f, m) => {
    const d = totalsDaily[m];
    if (f === null && d === null) return null;
    return (f ?? 0) + (d ?? 0);
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MONTH_LABELS[i],
    inProgress: year === currentYear && i + 1 === currentMonth,
  }));

  return {
    year,
    months,
    fixed,
    daily,
    totals: { fixed: totalsFixed, daily: totalsDaily, out: totalsOut },
    currentMonth: year === currentYear ? currentMonth : null,
  };
}

function fmtAmount(v: number | null): string {
  return v === null ? "" : v.toFixed(2);
}

export function yearSummaryToCsv(summary: YearSummary): string {
  const header = ["Kind", "Item", "Group", ...summary.months.map((m) => m.label), "Total"];
  const rows: (string | number)[][] = [header];

  for (const item of summary.fixed) {
    rows.push(["Fixed", item.name, item.group ?? "", ...item.values.map(fmtAmount), item.total.toFixed(2)]);
  }
  const fixedGrandTotal = summary.totals.fixed.reduce((s: number, v) => s + (v ?? 0), 0);
  rows.push(["Fixed", "Fixed total", "", ...summary.totals.fixed.map(fmtAmount), fixedGrandTotal.toFixed(2)]);

  for (const item of summary.daily) {
    rows.push(["Daily", item.name, "", ...item.values.map(fmtAmount), item.total.toFixed(2)]);
  }
  const dailyGrandTotal = summary.totals.daily.reduce((s: number, v) => s + (v ?? 0), 0);
  rows.push(["Daily", "Daily total", "", ...summary.totals.daily.map(fmtAmount), dailyGrandTotal.toFixed(2)]);

  const outGrandTotal = summary.totals.out.reduce((s: number, v) => s + (v ?? 0), 0);
  rows.push(["Total", "Total out", "", ...summary.totals.out.map(fmtAmount), outGrandTotal.toFixed(2)]);

  return toCsv(rows);
}

export interface MonthSummary {
  fixed: { expenseId: string; name: string; groupName: string | null; planned: number; paid: number; status: string }[];
  daily: { tagId: string | null; tagName: string; spendCount: number; amount: number }[];
  totals: {
    fixedPlanned: number;
    fixedPaid: number;
    dailyTotal: number;
    dailySpendCount: number;
    totalOut: number;
    prevMonthTotalOut: number | null;
    daysElapsed: number;
  };
}

export function monthSummaryToCsv(summary: MonthSummary): string {
  const rows: (string | number)[][] = [];

  rows.push(["Expense", "Group", "Planned", "Paid", "Status"]);
  for (const e of summary.fixed) {
    rows.push([e.name, e.groupName ?? "", e.planned.toFixed(2), e.paid.toFixed(2), e.status]);
  }
  const left = summary.totals.fixedPlanned - summary.totals.fixedPaid;
  rows.push([
    "Total",
    "",
    summary.totals.fixedPlanned.toFixed(2),
    summary.totals.fixedPaid.toFixed(2),
    left <= 0 ? "All paid" : `Left ${left.toFixed(2)}`,
  ]);

  rows.push([]);

  rows.push(["Tag", "Spends", "Average per spend", "Amount"]);
  for (const t of summary.daily) {
    const avg = t.spendCount > 0 ? t.amount / t.spendCount : 0;
    rows.push([t.tagName, t.spendCount, avg.toFixed(2), t.amount.toFixed(2)]);
  }
  const dailyAvg = summary.totals.dailySpendCount > 0 ? summary.totals.dailyTotal / summary.totals.dailySpendCount : 0;
  rows.push(["Total", summary.totals.dailySpendCount, dailyAvg.toFixed(2), summary.totals.dailyTotal.toFixed(2)]);

  return toCsv(rows);
}
