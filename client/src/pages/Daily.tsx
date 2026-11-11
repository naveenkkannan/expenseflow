import * as React from "react";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickAddBar } from "@/components/daily/QuickAddBar";
import { SpendFormSheet } from "@/components/daily/SpendFormSheet";
import { DailyList } from "@/components/daily/DailyList";
import { DailyCalendar } from "@/components/daily/DailyCalendar";
import { ManageTagsDialog } from "@/components/daily/ManageTagsDialog";
import { useDailyMonth } from "@/hooks/useDaily";
import { formatINR, cn } from "@/lib/utils";
import type { PaymentMethod, SpendEntry } from "@/lib/types";

type View = "list" | "calendar";

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function Daily() {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [view, setView] = React.useState<View>("list");
  const [selectedTagId, setSelectedTagId] = React.useState<string | null>(null);
  const [tagsOpen, setTagsOpen] = React.useState(false);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetInitial, setSheetInitial] = React.useState<{
    amount?: string;
    tagId?: string | null;
    paymentMethod?: PaymentMethod;
  }>({});
  const [editingSpend, setEditingSpend] = React.useState<{
    id: string;
    spentOn: string;
    amount: number;
    tagId: string | null;
    paymentMethod: PaymentMethod;
    note: string | null;
  } | null>(null);

  const { data, isLoading } = useDailyMonth(year, month, selectedTagId);

  function goToMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedTagId(null);
  }

  function openEdit(entry: SpendEntry, date: string) {
    setEditingSpend({
      id: entry.id,
      spentOn: date.slice(0, 10),
      amount: entry.amount,
      tagId: entry.tagId,
      paymentMethod: entry.paymentMethod,
      note: entry.note,
    });
    setSheetOpen(true);
  }

  function openAdd(prefill: { amount?: string; tagId?: string | null; paymentMethod?: PaymentMethod }) {
    setEditingSpend(null);
    setSheetInitial(prefill);
    setSheetOpen(true);
  }

  return (
    <AppShell
      title="Daily"
      subtitle="Track what you spend day to day."
      hideYearSwitcher
      actions={
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTagsOpen(true)}>
          <Settings className="h-4 w-4" /> Manage tags
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4 lg:order-2 lg:hidden">
          <MonthHeader year={year} month={month} onNavigate={goToMonth} />
          <SummaryRow data={data} isLoading={isLoading} />
          <ViewToggle view={view} onChange={setView} />
        </div>

        {/* Desktop: left column — add form + tag breakdown */}
        <div className="hidden flex-col gap-4 lg:order-1 lg:flex">
          <MonthHeader year={year} month={month} onNavigate={goToMonth} />
          <SummaryRow data={data} isLoading={isLoading} />
          <div className="rounded-lg border border-border p-4">
            <h2 className="mb-3 text-sm font-semibold">Add spend</h2>
            <Button className="w-full" onClick={() => openAdd({})}>
              Add spend
            </Button>
          </div>
        </div>

        <div className="lg:order-2 lg:flex lg:flex-col lg:gap-4">
          <div className="hidden lg:block">
            <ViewToggle view={view} onChange={setView} />
          </div>
          <div className="mt-2 pb-40 md:pb-6">
            {isLoading || !data ? (
              <Skeleton className="h-64 w-full" />
            ) : view === "list" ? (
              <DailyList data={data} selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} onEditSpend={openEdit} />
            ) : (
              <DailyCalendar data={data} onEditSpend={openEdit} />
            )}
          </div>
        </div>
      </div>

      <QuickAddBar lastPaymentMethod={data?.lastPaymentMethod ?? null} onOpenFullSheet={openAdd} />

      <SpendFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingSpend(null);
        }}
        spend={editingSpend}
        initialAmount={sheetInitial.amount}
        initialTagId={sheetInitial.tagId}
        initialPaymentMethod={sheetInitial.paymentMethod}
      />
      <ManageTagsDialog open={tagsOpen} onOpenChange={setTagsOpen} />
    </AppShell>
  );
}

function MonthHeader({
  year,
  month,
  onNavigate,
}: {
  year: number;
  month: number;
  onNavigate: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="icon" aria-label="Previous month" className="h-11 w-11" onClick={() => onNavigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold">{monthLabel(year, month)}</span>
      <Button variant="ghost" size="icon" aria-label="Next month" className="h-11 w-11" onClick={() => onNavigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SummaryRow({ data, isLoading }: { data: ReturnType<typeof useDailyMonth>["data"]; isLoading: boolean }) {
  if (isLoading || !data) {
    return <Skeleton className="h-16 w-full" />;
  }
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">Spent this month</p>
      <p className="text-2xl font-semibold tabular-nums">{formatINR(data.total)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatINR(data.avgPerDay)} a day on average · {data.daysLogged} day{data.daysLogged === 1 ? "" : "s"} logged
      </p>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex h-11 items-center rounded-md border border-input p-1">
      {(["list", "calendar"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex h-full items-center rounded-sm px-4 text-sm font-medium capitalize",
            view === v ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
