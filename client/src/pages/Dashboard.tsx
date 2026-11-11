import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import { ShareBar } from "@/components/charts/ShareBar";
import { PaymentFormDialog } from "@/components/payments/PaymentFormDialog";
import { SpendFormSheet } from "@/components/daily/SpendFormSheet";
import { useYear } from "@/hooks/useYear";
import { useDashboard } from "@/hooks/useDashboard";
import { useDeletePayment } from "@/hooks/useExpenses";
import { useDeleteSpend } from "@/hooks/useDaily";
import { formatINR, cn } from "@/lib/utils";
import type { Payment, RecentActivity } from "@/lib/types";

const currentMonth = new Date().getMonth() + 1;

export default function Dashboard() {
  const { year } = useYear();
  const { data, isLoading, isError } = useDashboard(year, currentMonth);
  const deletePayment = useDeletePayment();
  const deleteSpend = useDeleteSpend();
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<Payment | null>(null);
  const [spendSheetOpen, setSpendSheetOpen] = React.useState(false);
  const [editingSpend, setEditingSpend] = React.useState<Parameters<typeof SpendFormSheet>[0]["spend"]>(null);

  function openAddPayment() {
    setEditingPayment(null);
    setPaymentDialogOpen(true);
  }

  function openAddSpend() {
    setEditingSpend(null);
    setSpendSheetOpen(true);
  }

  function openEditActivity(item: RecentActivity) {
    if (item.kind === "payment") {
      setEditingPayment({ id: item.id, expenseId: item.expenseId!, paidOn: item.date, amount: item.amount, note: item.note });
      setPaymentDialogOpen(true);
    } else {
      setEditingSpend({
        id: item.id,
        spentOn: item.date,
        amount: item.amount,
        tagId: item.tagId,
        paymentMethod: item.paymentMethod ?? "upi",
        note: item.note,
      });
      setSpendSheetOpen(true);
    }
  }

  async function handleDeleteActivity(item: RecentActivity) {
    if (!window.confirm(`Delete this ${item.kind}?`)) return;
    try {
      if (item.kind === "payment") {
        await deletePayment.mutateAsync(item.id);
      } else {
        await deleteSpend.mutateAsync(item.id);
      }
      toast.success(`${item.kind === "payment" ? "Payment" : "Spend"} deleted.`);
    } catch {
      toast.error(`Could not delete the ${item.kind}.`);
    }
  }

  const expenseOptions = React.useMemo(
    () => data?.thisMonth.map((e) => ({ id: e.expenseId, name: e.name })) ?? [],
    [data]
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Where your money goes each month."
      actions={
        <div className="flex gap-2">
          <Button onClick={openAddPayment} size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add payment
          </Button>
          <Button onClick={openAddSpend} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add spend
          </Button>
        </div>
      }
    >
      {isError && (
        <p className="mb-4 text-sm text-destructive">Could not load the dashboard. Try refreshing.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Out this month"
          loading={isLoading}
          value={data && formatINR(data.summary.outThisMonth)}
          hint={data && `Fixed ${formatINR(data.summary.paidThisMonth)} · Daily ${formatINR(data.summary.dailyThisMonth)}`}
        />
        <SummaryCard
          label="Fixed still to pay"
          loading={isLoading}
          value={data && formatINR(data.summary.stillToPay)}
          hint={data && `${data.summary.expensesLeft} expense${data.summary.expensesLeft === 1 ? "" : "s"} left`}
        />
        <SummaryCard
          label="Daily spending"
          loading={isLoading}
          value={data && formatINR(data.summary.dailyThisMonth)}
          hint={data && `${formatINR(data.summary.dailyAvg)} a day on average`}
        />
        <SummaryCard
          label="Fixed every month"
          loading={isLoading}
          value={data && formatINR(data.summary.plannedPerMonth)}
          hint={data && `${data.summary.expenseCount} expense${data.summary.expenseCount === 1 ? "" : "s"}`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly expenses</CardTitle>
            <p className="text-xs text-muted-foreground">Fixed payments and daily spending, paid each month.</p>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <MonthlyBarChart monthly={data.monthly} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <p className="text-xs text-muted-foreground">How {data ? formatINR(data.summary.plannedPerMonth) : "…"} splits up, and what is paid.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isLoading || !data ? (
              <>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-40 w-full" />
              </>
            ) : data.thisMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active expenses this month.</p>
            ) : (
              <>
                <ShareBar entries={data.thisMonth} />
                <ul className="flex flex-col gap-3">
                  {data.thisMonth.map((e) => (
                    <li key={e.expenseId} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: e.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{e.name}</p>
                          {e.groupName && <p className="truncate text-xs text-muted-foreground">{e.groupName}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-muted-foreground">{e.sharePct}%</span>
                        <span className="text-sm font-medium tabular-nums">{formatINR(e.planned)}</span>
                        <StatusBadge status={e.status} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                    <p className="truncate text-sm font-medium">Daily spending</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatINR(data.summary.dailyAvg)}/day</span>
                    <span className="text-sm font-medium tabular-nums">{formatINR(data.summary.dailyThisMonth)}</span>
                    <Badge variant="secondary" className="whitespace-nowrap">So far</Badge>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <p className="text-xs text-muted-foreground">Payments and daily spends, newest first.</p>
          </div>
          <Link to="/expenses" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : data.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Note</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 pl-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((item) => (
                    <tr key={`${item.kind}-${item.id}`} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                          {item.name}
                          <Badge variant="outline" className="whitespace-nowrap text-[10px]">
                            {item.kind === "payment" ? "Fixed" : "Daily"}
                          </Badge>
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{item.note ?? "—"}</td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">{formatINR(item.amount)}</td>
                      <td className="py-3 pl-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${item.name}`}
                            className={cn("h-11 w-11")}
                            onClick={() => openEditActivity(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${item.name}`}
                            className="h-11 w-11 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteActivity(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        expenses={expenseOptions}
        payment={editingPayment}
      />
      <SpendFormSheet open={spendSheetOpen} onOpenChange={setSpendSheetOpen} spend={editingSpend} />
    </AppShell>
  );
}

function SummaryCard({ label, value, hint, loading }: { label: string; value?: string; hint?: string; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading || value === undefined ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        )}
        {!loading && hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
