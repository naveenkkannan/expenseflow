import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ExpenseGrid, Group, Payment } from "@/lib/types";

export function useExpenseGrid(year: number) {
  return useQuery<ExpenseGrid>({
    queryKey: ["expenses", year],
    queryFn: () => api.get<ExpenseGrid>(`/expenses?year=${year}`),
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };
}

export interface CreateExpenseInput {
  name: string;
  groupId: string | null;
  color: string;
  amount: number;
  activeFrom: string;
}

export function useCreateExpense() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: CreateExpenseInput) => api.post("/expenses", data),
    onSuccess: invalidate,
  });
}

export interface UpdateExpenseInput {
  id: string;
  name?: string;
  groupId?: string | null;
  color?: string;
  amount?: number;
  amountFrom?: string;
  activeTo?: string | null;
}

export function useUpdateExpense() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateExpenseInput) => api.patch(`/expenses/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: invalidate,
  });
}

export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: () => api.get<Group[]>("/groups"),
  });
}

function useInvalidateGroups() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["groups"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useCreateGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: (name: string) => api.post<Group>("/groups", { name }),
    onSuccess: invalidate,
  });
}

export function useUpdateGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/groups/${id}`, { name }),
    onSuccess: invalidate,
  });
}

export function useDeleteGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: invalidate,
  });
}

export function usePayments(expenseId: string | null, year: number, month: number) {
  return useQuery<Payment[]>({
    queryKey: ["payments", expenseId, year, month],
    queryFn: () => api.get<Payment[]>(`/payments?expense_id=${expenseId}&year=${year}&month=${month}`),
    enabled: !!expenseId,
  });
}

export interface CreatePaymentInput {
  expenseId: string;
  paidOn: string;
  amount: number;
  note?: string;
}

export function useCreatePayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (data: CreatePaymentInput) => api.post("/payments", data),
    onSuccess: invalidate,
  });
}

export function useUpdatePayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; paidOn?: string; amount?: number; note?: string | null }) =>
      api.patch(`/payments/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeletePayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: invalidate,
  });
}
