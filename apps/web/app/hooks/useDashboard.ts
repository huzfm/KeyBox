// hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "../api/license";
import Cookies from "js-cookie";

export const useDashboard = () => {
  const token = Cookies.get("jwt");

  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    enabled: !!token,
  });
};
