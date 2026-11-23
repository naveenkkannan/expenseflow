import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Debt, DebtDirection, DebtRepayment } from "@/lib/types";

export function useDebts() {
  return useQuery<Debt[]>({
    queryKey: ["debts"],
    queryFn: () => api.get<Debt[]>("/debts"),
  });
}

function useInvalidateDebts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["debts"] });
    queryClient.invalidateQueries({ queryKey: ["debt-repayments"] });
  };
}

export interface CreateDebtInput {
  personName: string;
  direction: DebtDirection;
  principal: number;
  dueDate?: string | null;
  note?: string;
}

export function useCreateDebt() {
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: (data: CreateDebtInput) => api.post<{ id: string }>("/debts", data),
    onSuccess: invalidate,
  });
}

export interface UpdateDebtInput {
  id: string;
  personName?: string;
  direction?: DebtDirection;
  principal?: number;
  dueDate?: string | null;
  note?: string | null;
}

export function useUpdateDebt() {
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateDebtInput) => api.patch(`/debts/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteDebt() {
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess: invalidate,
  });
}

export function useDebtRepayments(debtId: string | null) {
  return useQuery<DebtRepayment[]>({
    queryKey: ["debt-repayments", debtId],
    queryFn: () => api.get<DebtRepayment[]>(`/debt-repayments?debt_id=${debtId}`),
    enabled: !!debtId,
  });
}

export interface CreateDebtRepaymentInput {
  debtId: string;
  paidOn: string;
  amount: number;
  note?: string;
}

export function useCreateDebtRepayment() {
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: (data: CreateDebtRepaymentInput) => api.post("/debt-repayments", data),
    onSuccess: invalidate,
  });
}

export function useUpdateDebtRepayment() {
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; paidOn?: string; amount?: number; note?: string | null }) =>
      api.patch(`/debt-repayments/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteDebtRepayment() {
  const invalidate = useInvalidateDebts();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/debt-repayments/${id}`),
    onSuccess: invalidate,
  });
}
