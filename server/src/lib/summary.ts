import { toCsv } from "./csv.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type ExpenseType = "need" | "want" | "investment";

export interface YearSummaryRow {
  item_id: string;
  item_name: string;
  group_name: string | null;
  month: number;
  planned: string | null;
  paid: string;
  type: ExpenseType;
}

export interface YearItem {
  id: string;
  name: string;
  group: string | null;
  type: ExpenseType;
  values: (number | null)[];
  total: number;
}

export interface YearSummary {
  year: number;
  months: { month: number; label: string; inProgress: boolean }[];
  fixed: YearItem[];
  totals: { out: (number | null)[] };
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
  type Draft = { id: string; name: string; group: string | null; type: ExpenseType; values: (number | null)[] };
  const itemMap = new Map<string, Draft>();

  for (const r of rows) {
    if (!itemMap.has(r.item_id)) {
      itemMap.set(r.item_id, { id: r.item_id, name: r.item_name, group: r.group_name, type: r.type, values: Array(12).fill(null) });
    }
    itemMap.get(r.item_id)!.values[r.month - 1] = Number(r.paid);
  }

  const isFutureMonth = (m: number) => year > currentYear || (year === currentYear && m + 1 > currentMonth);

  const fixed = Array.from(itemMap.values())
    .map((draft) => {
      const values = draft.values.map((v, m) => (isFutureMonth(m) ? null : v));
      return { ...draft, values, total: values.reduce((sum: number, v) => sum + (v ?? 0), 0) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalsOut = Array.from({ length: 12 }, (_, m) => sumColumn(fixed, m));

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MONTH_LABELS[i],
    inProgress: year === currentYear && i + 1 === currentMonth,
  }));

  return {
    year,
    months,
    fixed,
    totals: { out: totalsOut },
    currentMonth: year === currentYear ? currentMonth : null,
  };
}

function fmtAmount(v: number | null): string {
  return v === null ? "" : v.toFixed(2);
}

export function yearSummaryToCsv(summary: YearSummary): string {
  const header = ["Item", "Group", "Type", ...summary.months.map((m) => m.label), "Total"];
  const rows: (string | number)[][] = [header];

  for (const item of summary.fixed) {
    rows.push([item.name, item.group ?? "", item.type, ...item.values.map(fmtAmount), item.total.toFixed(2)]);
  }

  const outGrandTotal = summary.totals.out.reduce((s: number, v) => s + (v ?? 0), 0);
  rows.push(["Total out", "", "", ...summary.totals.out.map(fmtAmount), outGrandTotal.toFixed(2)]);

  return toCsv(rows);
}

export interface MonthSummary {
  fixed: {
    expenseId: string;
    name: string;
    groupName: string | null;
    planned: number;
    paid: number;
    status: string;
    type: ExpenseType;
  }[];
  totals: {
    fixedPlanned: number;
    fixedPaid: number;
    totalOut: number;
    prevMonthTotalOut: number | null;
    daysElapsed: number;
  };
}

export function monthSummaryToCsv(summary: MonthSummary): string {
  const rows: (string | number)[][] = [];

  rows.push(["Expense", "Group", "Type", "Planned", "Paid", "Status"]);
  for (const e of summary.fixed) {
    rows.push([e.name, e.groupName ?? "", e.type, e.planned.toFixed(2), e.paid.toFixed(2), e.status]);
  }
  const left = summary.totals.fixedPlanned - summary.totals.fixedPaid;
  rows.push([
    "Total",
    "",
    "",
    summary.totals.fixedPlanned.toFixed(2),
    summary.totals.fixedPaid.toFixed(2),
    left <= 0 ? "All paid" : `Left ${left.toFixed(2)}`,
  ]);

  return toCsv(rows);
}

export interface TypeSummaryRow {
  type: ExpenseType;
  item_id: string;
  item_name: string;
  amount: string;
}

export interface TypeSummary {
  total: number;
  types: {
    type: ExpenseType;
    amount: number;
    pct: number;
    items: { id: string; name: string; amount: number }[];
  }[];
}

const TYPE_ORDER: ExpenseType[] = ["need", "want", "investment"];

export function buildTypeSummary(rows: TypeSummaryRow[]): TypeSummary {
  const byType = new Map<ExpenseType, { amount: number; items: TypeSummary["types"][number]["items"] }>();

  for (const r of rows) {
    const amount = Number(r.amount);
    if (!byType.has(r.type)) byType.set(r.type, { amount: 0, items: [] });
    const entry = byType.get(r.type)!;
    entry.amount += amount;
    entry.items.push({ id: r.item_id, name: r.item_name, amount });
  }

  const total = Array.from(byType.values()).reduce((sum, t) => sum + t.amount, 0);

  const types = TYPE_ORDER.filter((t) => byType.has(t))
    .map((type) => {
      const entry = byType.get(type)!;
      return {
        type,
        amount: entry.amount,
        pct: total > 0 ? Math.round((entry.amount / total) * 1000) / 10 : 0,
        items: entry.items.sort((a, b) => b.amount - a.amount),
      };
    })
    .filter((t) => t.amount > 0);

  return { total, types };
}
