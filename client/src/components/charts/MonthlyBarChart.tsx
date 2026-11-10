import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { MonthlyEntry } from "@/lib/types";
import { formatINR } from "@/lib/utils";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthlyBarChart({ monthly }: { monthly: MonthlyEntry[] }) {
  const expenseMeta = new Map<string, { name: string; color: string }>();
  for (const month of monthly) {
    for (const e of month.byExpense) {
      if (!expenseMeta.has(e.expenseId)) {
        expenseMeta.set(e.expenseId, { name: e.name, color: e.color });
      }
    }
  }
  const expenseIds = Array.from(expenseMeta.keys());

  const data = monthly.map((m, i) => {
    const row: Record<string, number | string> = {
      month: MONTH_LABELS[i] ?? m.month,
      planned: m.planned,
    };
    for (const e of m.byExpense) {
      row[e.expenseId] = e.paid;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="hsl(240 6% 90%)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={56}
          tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
        />
        <Tooltip
          formatter={(value: number, key: string) => {
            if (key === "planned") return [formatINR(value), "Plan"];
            return [formatINR(value), expenseMeta.get(key)?.name ?? key];
          }}
        />
        <Legend
          formatter={(value: string) => expenseMeta.get(value)?.name ?? value}
          wrapperStyle={{ fontSize: 12 }}
        />
        {expenseIds.map((id) => (
          <Bar key={id} dataKey={id} stackId="paid" fill={expenseMeta.get(id)!.color} radius={0} />
        ))}
        <Line
          type="monotone"
          dataKey="planned"
          stroke="hsl(240 6% 46%)"
          strokeDasharray="4 4"
          strokeWidth={2}
          dot={false}
          legendType="none"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
