import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardData } from "@/lib/types";

export function useDashboard(year: number, month: number) {
  return useQuery<DashboardData>({
    queryKey: ["dashboard", year, month],
    queryFn: () => api.get<DashboardData>(`/dashboard?year=${year}&month=${month}`),
  });
}
