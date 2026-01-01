import { useMutation } from "@tanstack/react-query";
import { toggleLicenseStatus } from "../api/license";

export const useToggleLicense = (
  refetch: () => void,
  setMsg: (msg: string) => void
) =>
  useMutation({
    mutationFn: toggleLicenseStatus,
    onSuccess: (data) => {
      setMsg(`🔄 ${data.message}`);
      refetch();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to toggle";
      setMsg(message);
    },
  });
