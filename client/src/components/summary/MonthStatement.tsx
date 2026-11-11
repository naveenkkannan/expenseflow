import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatINR } from "@/lib/utils";
import type { SummaryMonth } from "@/lib/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthStatement({
  year,
  month,
  data,
  isLoading,
  canGoNext,
  onNavigate,
}: {
  year: number;
  month: number;
  data: SummaryMonth | undefined;
  isLoading: boolean;
  canGoNext: boolean;
  onNavigate: (delta: number) => void;
}) {
  const isComplete = !data || data.totals.daysElapsed >= daysInMonth(year, month);
  const diff = data && data.totals.prevMonthTotalOut !== null ? data.totals.totalOut - data.totals.prevMonthTotalOut : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2 print:hidden">
        <Button variant="ghost" size="icon" aria-label="Previous month" className="h-11 w-11" onClick={() => onNavigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Navigate months</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next month"
          className="h-11 w-11"
          disabled={!canGoNext}
          onClick={() => onNavigate(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card className="mx-auto w-full max-w-[860px] print:border-0 print:shadow-none">
        <CardHeader className="items-center text-center">
          <h2 className="text-xl font-semibold">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isLoading || !data
              ? "Loading…"
              : isComplete
                ? "Complete month"
                : `In progress, ${data.totals.daysElapsed} day${data.totals.daysElapsed === 1 ? "" : "s"} so far`}
          </p>
          {diff !== null && (
            <p className="text-xs text-muted-foreground">
              {diff >= 0 ? "+" : ""}
              {formatINR(diff)} vs {MONTH_NAMES[month === 1 ? 11 : month - 2]}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {isLoading || !data ? (
            <>
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : (
            <>
              <section>
                <h3 className="mb-3 text-sm font-semibold">Fixed expenses</h3>
                {data.fixed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fixed expenses this month.</p>
                ) : (
                  <>
                    <table className="hidden w-full text-sm sm:table">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Expense</th>
                          <th className="py-2 pr-4 font-medium text-right">Planned</th>
                          <th className="py-2 pr-4 font-medium text-right">Paid</th>
                          <th className="py-2 pl-4 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.fixed.map((e) => (
                          <tr key={e.expenseId} className="border-b border-border last:border-0 print:break-inside-avoid">
                            <td className="py-2 pr-4">
                              {e.name}
                              {e.groupName && <span className="ml-1 text-xs text-muted-foreground">· {e.groupName}</span>}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">{formatINR(e.planned)}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{formatINR(e.paid)}</td>
                            <td className="py-2 pl-4 text-right">
                              <StatusBadge status={e.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-semibold">
                          <td className="py-2 pr-4">Total</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatINR(data.totals.fixedPlanned)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{formatINR(data.totals.fixedPaid)}</td>
                          <td className="py-2 pl-4 text-right text-xs">
                            {data.totals.fixedPaid >= data.totals.fixedPlanned
                              ? "All paid"
                              : `${formatINR(data.totals.fixedPlanned - data.totals.fixedPaid)} left`}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <ul className="flex flex-col gap-2 sm:hidden">
                      {data.fixed.map((e) => (
                        <li key={e.expenseId} className="rounded-md border border-border px-3 py-2 print:break-inside-avoid">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{e.name}</span>
                            <span className="tabular-nums">{formatINR(e.paid)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>Planned {formatINR(e.planned)}</span>
                            <StatusBadge status={e.status} />
                          </div>
                        </li>
                      ))}
                      <li className="flex items-center justify-between gap-2 border-t-2 border-border px-3 py-2 font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">{formatINR(data.totals.fixedPaid)}</span>
                      </li>
                    </ul>
                  </>
                )}
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold">Daily spending</h3>
                {data.daily.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No spends this month.</p>
                ) : (
                  <>
                    <table className="hidden w-full text-sm sm:table">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Tag</th>
                          <th className="py-2 pr-4 font-medium text-right">Spends</th>
                          <th className="py-2 pr-4 font-medium text-right">Average per spend</th>
                          <th className="py-2 pl-4 font-medium text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.daily.map((t) => (
                          <tr key={t.tagId ?? "untagged"} className="border-b border-border last:border-0 print:break-inside-avoid">
                            <td className="py-2 pr-4">{t.tagName}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{t.spendCount}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">
                              {formatINR(t.spendCount > 0 ? t.amount / t.spendCount : 0)}
                            </td>
                            <td className="py-2 pl-4 text-right tabular-nums">{formatINR(t.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-semibold">
                          <td className="py-2 pr-4">Total</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{data.totals.dailySpendCount}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatINR(
                              data.totals.dailySpendCount > 0
                                ? data.totals.dailyTotal / data.totals.dailySpendCount
                                : 0
                            )}
                          </td>
                          <td className="py-2 pl-4 text-right tabular-nums">{formatINR(data.totals.dailyTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    <ul className="flex flex-col gap-2 sm:hidden">
                      {data.daily.map((t) => (
                        <li key={t.tagId ?? "untagged"} className="rounded-md border border-border px-3 py-2 print:break-inside-avoid">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{t.tagName}</span>
                            <span className="tabular-nums">{formatINR(t.amount)}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t.spendCount} spend{t.spendCount === 1 ? "" : "s"} · avg{" "}
                            {formatINR(t.spendCount > 0 ? t.amount / t.spendCount : 0)}
                          </div>
                        </li>
                      ))}
                      <li className="flex items-center justify-between gap-2 border-t-2 border-border px-3 py-2 font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">{formatINR(data.totals.dailyTotal)}</span>
                      </li>
                    </ul>
                  </>
                )}
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
