import * as React from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DebtSection } from "@/components/debts/DebtSection";
import { DebtDialog } from "@/components/debts/DebtDialog";
import { DebtRepaymentsPanel } from "@/components/debts/DebtRepaymentsPanel";
import { useDebts } from "@/hooks/useDebts";
import { formatINR } from "@/lib/utils";
import type { Debt } from "@/lib/types";

export default function Debts() {
  const { data: debts, isLoading, isError } = useDebts();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDebt, setEditingDebt] = React.useState<Debt | null>(null);
  const [selectedDebtId, setSelectedDebtId] = React.useState<string | null>(null);

  function openAdd() {
    setEditingDebt(null);
    setDialogOpen(true);
  }

  function openEdit(debt: Debt) {
    setEditingDebt(debt);
    setDialogOpen(true);
  }

  function selectDebt(debt: Debt) {
    setSelectedDebtId((current) => (current === debt.id ? null : debt.id));
  }

  const owedToMe = React.useMemo(() => debts?.filter((d) => d.direction === "owed_to_me") ?? [], [debts]);
  const iOwe = React.useMemo(() => debts?.filter((d) => d.direction === "i_owe") ?? [], [debts]);
  const selectedDebt = debts?.find((d) => d.id === selectedDebtId) ?? null;

  const owedToMeTotal = owedToMe.reduce((sum, d) => sum + d.remaining, 0);
  const iOweTotal = iOwe.reduce((sum, d) => sum + d.remaining, 0);
  const net = owedToMeTotal - iOweTotal;

  return (
    <AppShell
      title="Debts"
      subtitle="Money owed to you, and money you owe."
      hideYearSwitcher
      actions={
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add debt
        </Button>
      }
    >
      {isError && <p className="mb-4 text-sm text-destructive">Could not load debts. Try refreshing.</p>}

      {isLoading || !debts ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StripCard label="Owed to you" value={formatINR(owedToMeTotal)} />
          <StripCard label="You owe" value={formatINR(iOweTotal)} />
          <StripCard
            label="Net"
            value={`${net >= 0 ? "+" : ""}${formatINR(net)}`}
            hint={net >= 0 ? "In your favour" : "You're net down"}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading || !debts ? (
          <>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          <>
            <DebtSection
              title="Owed to you"
              subtitle="People who owe you money."
              debts={owedToMe}
              selectedDebtId={selectedDebtId}
              onSelect={selectDebt}
              onEdit={openEdit}
            />
            <DebtSection
              title="You owe"
              subtitle="People you owe money to."
              debts={iOwe}
              selectedDebtId={selectedDebtId}
              onSelect={selectDebt}
              onEdit={openEdit}
            />
          </>
        )}
      </div>

      {selectedDebt && <DebtRepaymentsPanel debt={selectedDebt} />}

      <DebtDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingDebt(null);
        }}
        debt={editingDebt}
      />
    </AppShell>
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
