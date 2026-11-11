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
  daily: number;
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
  dailyThisMonth: number;
  dailyAvg: number;
  outThisMonth: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  monthly: MonthlyEntry[];
  thisMonth: ThisMonthEntry[];
  recent: RecentActivity[];
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

export type PaymentMethod = "upi" | "card" | "cash";

export interface SpendTag {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface SpendEntry {
  id: string;
  amount: number;
  note: string | null;
  tagId: string | null;
  tagName: string;
  tagColor: string;
  paymentMethod: PaymentMethod;
}

export interface DailyDay {
  date: string;
  total: number;
  entries: SpendEntry[];
}

export interface DailyCalendarDay {
  date: string;
  total: number;
}

export interface DailyTagShare {
  tagId: string | null;
  name: string;
  color: string;
  amount: number;
}

export interface DailyMonth {
  total: number;
  daysLogged: number;
  avgPerDay: number;
  byTag: DailyTagShare[];
  days: DailyDay[];
  calendar: DailyCalendarDay[];
  lastPaymentMethod: PaymentMethod | null;
}

export interface SpendSuggestion {
  label: string;
  amount: number;
  tagId: string | null;
  tagName: string | null;
  tagColor: string | null;
  paymentMethod: PaymentMethod;
}

export interface RecentActivity {
  id: string;
  kind: "payment" | "spend";
  date: string;
  name: string;
  color: string;
  amount: number;
  note: string | null;
  expenseId: string | null;
  tagId: string | null;
  paymentMethod: PaymentMethod | null;
}
