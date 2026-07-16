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
              mutationFn: async ({
                     name,
                     email,
              }: {
                     name: string;
                     email: string;
              }) => {
                     const { data } = await api.post("/clients", {
                            name,
                            email,
                     });
                     return data;
              },
              onSuccess: () =>
                     qc.invalidateQueries({ queryKey: ["dashboard"] }),
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
              onSuccess: () =>
                     qc.invalidateQueries({ queryKey: ["dashboard"] }),
       });
};

const patchLicense = (
       clients: any,
       key: string,
       patch: (license: any) => any,
) => {
       if (!Array.isArray(clients)) return clients;

       return clients.map((client: any) => ({
              ...client,
              projects: client.projects?.map((project: any) => ({
                     ...project,
                     licenses: project.licenses?.map((license: any) =>
                            license.key === key
                                   ? { ...license, ...patch(license) }
                                   : license,
                     ),
              })),
       }));
};

const flipLicenseStatus = (clients: any, key: string) =>
       patchLicense(clients, key, (license) => ({
              status: license.status === "ACTIVE" ? "REVOKED" : "ACTIVE",
       }));

export const useToggleLicense = () => {
       const qc = useQueryClient();

       return useMutation({
              mutationFn: async (key: string) => {
                     const { data } = await api.patch(
                            `/license/revoke/${key}`,
                     );
                     return data;
              },
              onMutate: async (key: string) => {
                     await qc.cancelQueries({ queryKey: ["dashboard"] });

                     const previous = qc.getQueryData(["dashboard"]);

                     qc.setQueryData(["dashboard"], (old: any) =>
                            flipLicenseStatus(old, key),
                     );

                     return { previous };
              },
              onError: (_err, _key, context) => {
                     if (context?.previous) {
                            qc.setQueryData(
                                   ["dashboard"],
                                   context.previous,
                            );
                     }
              },
              onSettled: () =>
                     qc.invalidateQueries({ queryKey: ["dashboard"] }),
       });
};

export const useRenewLicense = () => {
       const qc = useQueryClient();

       return useMutation({
              mutationFn: async ({
                     key,
                     duration,
              }: {
                     key: string;
                     duration?: number;
              }) => {
                     const { data } = await api.patch(
                            `/license/renew/${key}`,
                            duration ? { duration } : {},
                     );
                     return data;
              },
              onMutate: async ({
                     key,
              }: {
                     key: string;
                     duration?: number;
              }) => {
                     await qc.cancelQueries({ queryKey: ["dashboard"] });

                     const previous = qc.getQueryData(["dashboard"]);

                     qc.setQueryData(["dashboard"], (old: any) =>
                            patchLicense(old, key, () => ({
                                   status: "ACTIVE",
                            })),
                     );

                     return { previous };
              },
              onSuccess: (data, { key }) => {
                     qc.setQueryData(["dashboard"], (old: any) =>
                            patchLicense(old, key, () => ({
                                   status: data.status,
                                   expiresAt: data.expiresAt,
                            })),
                     );
              },
              onError: (_err, _vars, context) => {
                     if (context?.previous) {
                            qc.setQueryData(
                                   ["dashboard"],
                                   context.previous,
                            );
                     }
              },
              onSettled: () =>
                     qc.invalidateQueries({ queryKey: ["dashboard"] }),
       });
};
