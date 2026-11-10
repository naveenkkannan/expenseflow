import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ExpenseStatus = "not_active" | "upcoming" | "paid" | "partial" | "missed" | "to_pay";

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  not_active: "Not active",
  upcoming: "Upcoming",
  paid: "Paid",
  partial: "Partial",
  missed: "Missed",
  to_pay: "To pay",
};

const STATUS_VARIANT: Record<ExpenseStatus, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  not_active: "outline",
  upcoming: "secondary",
  paid: "success",
  partial: "warning",
  missed: "destructive",
  to_pay: "secondary",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status as ExpenseStatus] ?? status;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = STATUS_VARIANT[status as ExpenseStatus] ?? "outline";
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      {statusLabel(status)}
    </Badge>
  );
}
