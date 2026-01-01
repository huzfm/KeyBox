// hooks/useCreateLicense.ts
import { useMutation } from "@tanstack/react-query";
import { createLicenseAPI } from "../api/license";

export const useCreateLicense = (
  onSuccess: () => void,
  onError: (e: unknown) => void
) =>
  useMutation({
    mutationFn: createLicenseAPI,
    onSuccess,
    onError,
  });
