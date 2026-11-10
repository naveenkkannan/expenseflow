import * as React from "react";
import { Plus, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { MonthlyTracker, type SelectedCell } from "@/components/expenses/MonthlyTracker";
import { MonthPaymentsPanel } from "@/components/expenses/MonthPaymentsPanel";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { EditExpenseDialog } from "@/components/expenses/EditExpenseDialog";
import { ManageGroupsDialog } from "@/components/groups/ManageGroupsDialog";
import { useYear } from "@/hooks/useYear";
import { useExpenseGrid } from "@/hooks/useExpenses";
import type { GridExpense } from "@/lib/types";

export default function Expenses() {
  const { year } = useYear();
  const { data, isLoading, isError } = useExpenseGrid(year);

  const [addOpen, setAddOpen] = React.useState(false);
  const [groupsOpen, setGroupsOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<GridExpense | null>(null);
  const [selected, setSelected] = React.useState<SelectedCell | null>(null);

  const selectedExpense = selected ? data?.expenses.find((e) => e.id === selected.expenseId) ?? null : null;

  return (
    <AppShell
      title="Expenses"
      subtitle="What you pay every month, and what you have paid so far."
      actions={
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      }
    >
      {isError && (
        <p className="mb-4 text-sm text-destructive">Could not load expenses. Try refreshing.</p>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Monthly expenses</CardTitle>
            <p className="text-xs text-muted-foreground">Change an amount and choose the month it applies from. Earlier months keep their old amount.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setGroupsOpen(true)}>
            <Settings className="h-4 w-4" /> Manage groups
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ExpenseTable expenses={data.expenses} onEdit={setEditingExpense} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Monthly tracker</CardTitle>
          <p className="text-xs text-muted-foreground">Select a month to see its payments, or add one.</p>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <MonthlyTracker expenses={data.expenses} selected={selected} onSelect={setSelected} />
          )}
        </CardContent>
      </Card>

      {selected && selectedExpense && <MonthPaymentsPanel cell={selected} expense={selectedExpense} />}

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditExpenseDialog
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
        expense={editingExpense}
      />
      <ManageGroupsDialog open={groupsOpen} onOpenChange={setGroupsOpen} />
    </AppShell>
  );
}
