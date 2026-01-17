import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard");
      return data.data;
    },
  });

export const useCreateClient = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      const { data } = await api.post("/clients", { name, email });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });
};

export const useCreateProject = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      clientId: string;
      projectName: string;
      duration: number;
      services: string[];
    }) => {
      await api.post("/projects/createProject", payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });
};

export const useToggleLicense = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      await api.patch(`license/revoke/${key}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });
};
