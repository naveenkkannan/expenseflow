export type ExpenseStatus = "not_active" | "upcoming" | "paid" | "partial" | "missed" | "to_pay";
export type ExpenseType = "need" | "want" | "investment";

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
  type: ExpenseType;
  groupId: string | null;
  groupName: string | null;
  currentAmount: number;
  activeFrom: string;
  activeTo: string | null;
  paidSoFar: number;
  ended: boolean;
  monthsLeft: number | null;
  plannedYear: number;
  paidYear: number;
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

export interface RecentPayment {
  id: string;
  expenseId: string;
  expenseName: string;
  color: string;
  paidOn: string;
  amount: number;
  note: string | null;
}

export interface SummaryYearItem {
  id: string;
  name: string;
  group: string | null;
  type: ExpenseType;
  values: (number | null)[];
  total: number;
}

export interface SummaryYearMonth {
  month: number;
  label: string;
  inProgress: boolean;
}

export interface SummaryYear {
  year: number;
  months: SummaryYearMonth[];
  fixed: SummaryYearItem[];
  totals: { out: (number | null)[] };
  currentMonth: number | null;
}

export interface SummaryMonthFixedRow {
  expenseId: string;
  name: string;
  groupName: string | null;
  planned: number;
  paid: number;
  status: ExpenseStatus;
  type: ExpenseType;
}

export interface SummaryMonth {
  fixed: SummaryMonthFixedRow[];
  totals: {
    fixedPlanned: number;
    fixedPaid: number;
    totalOut: number;
    prevMonthTotalOut: number | null;
    daysElapsed: number;
  };
}

export interface TypeSummaryItem {
  id: string;
  name: string;
  amount: number;
}

export interface TypeSummaryGroup {
  type: ExpenseType;
  amount: number;
  pct: number;
  items: TypeSummaryItem[];
}

export interface TypeSummary {
  total: number;
  types: TypeSummaryGroup[];
}

export type DebtDirection = "owed_to_me" | "i_owe";
export type DebtStatus = "open" | "settled";

export interface Debt {
  id: string;
  personName: string;
  direction: DebtDirection;
  principal: number;
  repaid: number;
  remaining: number;
  repaymentCount: number;
  dueDate: string | null;
  note: string | null;
  status: DebtStatus;
}

export interface DebtRepayment {
  id: string;
  debtId: string;
  paidOn: string;
  amount: number;
  note: string | null;
}
