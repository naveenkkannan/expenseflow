import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SummaryMonth, SummaryYear, TypeSummary } from "@/lib/types";

export function useYearSummary(year: number) {
  return useQuery<SummaryYear>({
    queryKey: ["summary", "year", year],
    queryFn: () => api.get<SummaryYear>(`/summary/year?year=${year}`),
  });
}

export function useMonthSummary(year: number, month: number) {
  return useQuery<SummaryMonth>({
    queryKey: ["summary", "month", year, month],
    queryFn: () => api.get<SummaryMonth>(`/summary/month?year=${year}&month=${month}`),
  });
}

export function useTypeSummary(year: number, month?: number) {
  return useQuery<TypeSummary>({
    queryKey: ["summary", "types", year, month ?? "ytd"],
    queryFn: () => api.get<TypeSummary>(`/summary/types?year=${year}${month ? `&month=${month}` : ""}`),
  });
}
