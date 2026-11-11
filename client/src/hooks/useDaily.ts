import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DailyMonth, PaymentMethod, SpendSuggestion, SpendTag } from "@/lib/types";

export function useDailyMonth(year: number, month: number, tagId: string | null) {
  return useQuery<DailyMonth>({
    queryKey: ["daily", year, month, tagId],
    queryFn: () =>
      api.get<DailyMonth>(`/daily?year=${year}&month=${month}${tagId ? `&tag_id=${tagId}` : ""}`),
  });
}

export function useSpendSuggestions() {
  return useQuery<SpendSuggestion[]>({
    queryKey: ["daily-suggestions"],
    queryFn: () => api.get<SpendSuggestion[]>("/daily/suggestions"),
  });
}

function useInvalidateDaily() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["daily"] });
    queryClient.invalidateQueries({ queryKey: ["daily-suggestions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export interface CreateSpendInput {
  spentOn: string;
  amount: number;
  tagId: string | null;
  paymentMethod: PaymentMethod;
  note?: string;
}

export function useCreateSpend() {
  const invalidate = useInvalidateDaily();
  return useMutation({
    mutationFn: (data: CreateSpendInput) => api.post("/spends", data),
    onSuccess: invalidate,
  });
}

export interface UpdateSpendInput {
  id: string;
  spentOn?: string;
  amount?: number;
  tagId?: string | null;
  paymentMethod?: PaymentMethod;
  note?: string | null;
}

export function useUpdateSpend() {
  const invalidate = useInvalidateDaily();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateSpendInput) => api.patch(`/spends/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSpend() {
  const invalidate = useInvalidateDaily();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/spends/${id}`),
    onSuccess: invalidate,
  });
}

export function useSpendTags() {
  return useQuery<SpendTag[]>({
    queryKey: ["spend-tags"],
    queryFn: () => api.get<SpendTag[]>("/spend-tags"),
  });
}

function useInvalidateSpendTags() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["spend-tags"] });
    queryClient.invalidateQueries({ queryKey: ["daily"] });
  };
}

export function useCreateSpendTag() {
  const invalidate = useInvalidateSpendTags();
  return useMutation({
    mutationFn: (data: { name: string; color: string }) => api.post<SpendTag>("/spend-tags", data),
    onSuccess: invalidate,
  });
}

export function useUpdateSpendTag() {
  const invalidate = useInvalidateSpendTags();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch<SpendTag>(`/spend-tags/${id}`, data),
    onSuccess: invalidate,
  });
}

export function useDeleteSpendTag() {
  const invalidate = useInvalidateSpendTags();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/spend-tags/${id}`),
    onSuccess: invalidate,
  });
}
