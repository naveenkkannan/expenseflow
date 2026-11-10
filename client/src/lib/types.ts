export type ExpenseStatus = "not_active" | "upcoming" | "paid" | "partial" | "missed" | "to_pay";

export interface User {
  id: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MonthByExpense {
  expenseId: string;
  name: string;
  color: string;
  paid: number;
}

export interface MonthlyEntry {
  month: string;
  planned: number;
  byExpense: MonthByExpense[];
}

export interface ThisMonthEntry {
  expenseId: string;
  name: string;
  color: string;
  groupName: string | null;
  planned: number;
  paid: number;
  status: ExpenseStatus;
  sharePct: number;
}

export interface RecentPayment {
  id: string;
  expenseId: string;
  expenseName: string;
  color: string;
  paidOn: string;
  amount: number;
  note: string | null;
}

export interface DashboardSummary {
  paidThisMonth: number;
  stillToPay: number;
  expensesLeft: number;
  paidThisYear: number;
  plannedPerMonth: number;
  plannedForYear: number;
  expenseCount: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthly: MonthlyEntry[];
  thisMonth: ThisMonthEntry[];
  recent: RecentPayment[];
}

export interface GridMonth {
  month: string;
  planned: number;
  paid: number;
  status: ExpenseStatus;
}

export interface GridExpense {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
  groupName: string | null;
  currentAmount: number;
  activeFrom: string;
  activeTo: string | null;
  paidSoFar: number;
  months: GridMonth[];
}

export interface ExpenseGrid {
  groups: Group[];
  expenses: GridExpense[];
}

export interface Payment {
  id: string;
  expenseId: string;
  paidOn: string;
  amount: number;
  note: string | null;
}
