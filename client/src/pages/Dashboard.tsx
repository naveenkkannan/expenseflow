import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart";
import { ShareBar } from "@/components/charts/ShareBar";
import { PaymentFormDialog } from "@/components/payments/PaymentFormDialog";
import { useYear } from "@/hooks/useYear";
import { useDashboard } from "@/hooks/useDashboard";
import { useDeletePayment } from "@/hooks/useExpenses";
import { formatINR, cn } from "@/lib/utils";
import type { Payment } from "@/lib/types";

const currentMonth = new Date().getMonth() + 1;

export default function Dashboard() {
  const { year } = useYear();
  const { data, isLoading, isError } = useDashboard(year, currentMonth);
  const deletePayment = useDeletePayment();
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<Payment | null>(null);

  function openAddPayment() {
    setEditingPayment(null);
    setPaymentDialogOpen(true);
  }

  function openEditPayment(p: Payment) {
    setEditingPayment(p);
    setPaymentDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await deletePayment.mutateAsync(id);
      toast.success("Payment deleted.");
    } catch {
      toast.error("Could not delete the payment.");
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
        <Button onClick={openAddPayment} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add payment
        </Button>
      }
    >
      {isError && (
        <p className="mb-4 text-sm text-destructive">Could not load the dashboard. Try refreshing.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Paid this month" loading={isLoading} value={data && formatINR(data.summary.paidThisMonth)} hint={data && `of ${formatINR(data.summary.plannedPerMonth)} planned`} />
        <SummaryCard label="Still to pay" loading={isLoading} value={data && formatINR(data.summary.stillToPay)} hint={data && `${data.summary.expensesLeft} expense${data.summary.expensesLeft === 1 ? "" : "s"} left this month`} />
        <SummaryCard label="Paid this year" loading={isLoading} value={data && formatINR(data.summary.paidThisYear)} hint={data && `of ${formatINR(data.summary.plannedForYear)} for the year`} />
        <SummaryCard label="Every month" loading={isLoading} value={data && formatINR(data.summary.plannedPerMonth)} hint={data && `${data.summary.expenseCount} expense${data.summary.expenseCount === 1 ? "" : "s"}`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly expenses</CardTitle>
            <p className="text-xs text-muted-foreground">Paid each month. The dashed line is the {data ? formatINR(data.summary.plannedPerMonth) : "…"} plan.</p>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent payments</CardTitle>
            <p className="text-xs text-muted-foreground">Edit or delete any payment. Several payments in a month add up.</p>
          </div>
          <Link to="/expenses" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-40 w-full" />
          ) : data.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payments logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Expense</th>
                    <th className="py-2 pr-4 font-medium">Note</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 pl-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {new Date(p.paidOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden="true" />
                          {p.expenseName}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.note ?? "—"}</td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">{formatINR(p.amount)}</td>
                      <td className="py-3 pl-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit payment for ${p.expenseName}`}
                            className={cn("h-11 w-11")}
                            onClick={() =>
                              openEditPayment({ id: p.id, expenseId: p.expenseId, paidOn: p.paidOn, amount: p.amount, note: p.note })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete payment for ${p.expenseName}`}
                            className="h-11 w-11 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id)}
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
