import * as React from "react";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { YearLedger } from "@/components/summary/YearLedger";
import { MonthStatement } from "@/components/summary/MonthStatement";
import { useYear } from "@/hooks/useYear";
import { useYearSummary, useMonthSummary } from "@/hooks/useSummary";
import { API_BASE_URL } from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";

type Tab = "year" | "month";

const now = new Date();

export default function Summary() {
  const { year, setYear } = useYear();
  const [tab, setTab] = React.useState<Tab>("year");
  const [month, setMonth] = React.useState(now.getMonth() + 1);

  const isCurrentYear = year === now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yearQuery = useYearSummary(year);
  const monthQuery = useMonthSummary(year, month);

  function goToMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  function openMonth(m: number) {
    setMonth(m);
    setTab("month");
  }

  const canGoNextMonth = !(year > now.getFullYear() || (isCurrentYear && month >= currentMonth));

  const exportHref =
    tab === "year"
      ? `${API_BASE_URL}/api/summary/year.csv?year=${year}`
      : `${API_BASE_URL}/api/summary/month.csv?year=${year}&month=${month}`;

  return (
    <AppShell
      title="Summary"
      subtitle="A ledger view and printable monthly statement."
      actions={
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Export PDF
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={exportHref} download>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </Button>
        </div>
      }
    >
      <div className="mb-4 inline-flex h-11 items-center rounded-md border border-input p-1 print:hidden">
        {(["year", "month"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex h-full items-center rounded-sm px-4 text-sm font-medium capitalize",
              tab === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <TotalsStrip tab={tab} year={year} month={month} yearData={yearQuery.data} monthData={monthQuery.data} />

      <div className="mt-6">
        {tab === "year" ? (
          yearQuery.isLoading || !yearQuery.data ? (
            <Skeleton className="h-96 w-full" />
          ) : yearQuery.data.fixed.length === 0 && yearQuery.data.daily.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No spends or payments in this period.</p>
          ) : (
            <YearLedger data={yearQuery.data} onMonthClick={openMonth} />
          )
        ) : (
          <MonthStatement
            year={year}
            month={month}
            data={monthQuery.data}
            isLoading={monthQuery.isLoading}
            canGoNext={canGoNextMonth}
            onNavigate={goToMonth}
          />
        )}
      </div>
    </AppShell>
  );
}

function TotalsStrip({
  tab,
  month,
  yearData,
  monthData,
}: {
  tab: Tab;
  year: number;
  month: number;
  yearData: ReturnType<typeof useYearSummary>["data"];
  monthData: ReturnType<typeof useMonthSummary>["data"];
}) {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  if (tab === "year") {
    if (!yearData) {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    const outTotal = yearData.totals.out.reduce((s: number, v) => s + (v ?? 0), 0);
    const fixedTotal = yearData.totals.fixed.reduce((s: number, v) => s + (v ?? 0), 0);
    const dailyTotal = yearData.totals.daily.reduce((s: number, v) => s + (v ?? 0), 0);
    const activeMonths = yearData.totals.out.filter((v) => v !== null).length || 1;
    const sharePct = (part: number) => (outTotal > 0 ? Math.round((part / outTotal) * 100) : 0);

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StripCard label="Total out" value={formatINR(outTotal)} hint={`${formatINR(outTotal / activeMonths)} a month on average`} />
        <StripCard label="Fixed expenses" value={formatINR(fixedTotal)} hint={`${sharePct(fixedTotal)}% of total`} />
        <StripCard label="Daily spending" value={formatINR(dailyTotal)} hint={`${sharePct(dailyTotal)}% of total`} />
      </div>
    );
  }

  if (!monthData) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  const { totals } = monthData;
  const diff = totals.prevMonthTotalOut !== null ? totals.totalOut - totals.prevMonthTotalOut : null;
  const prevLabel = MONTH_NAMES[month === 1 ? 11 : month - 2];
  const perDay = totals.daysElapsed > 0 ? totals.dailyTotal / totals.daysElapsed : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StripCard
        label="Total out"
        value={formatINR(totals.totalOut)}
        hint={diff === null ? undefined : `${diff >= 0 ? "+" : ""}${formatINR(diff)} vs ${prevLabel}`}
      />
      <StripCard
        label="Fixed expenses"
        value={formatINR(totals.fixedPaid)}
        hint={`of ${formatINR(totals.fixedPlanned)} planned`}
      />
      <StripCard label="Daily spending" value={formatINR(totals.dailyTotal)} hint={`${formatINR(perDay)} a day`} />
    </div>
  );
}

function StripCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
