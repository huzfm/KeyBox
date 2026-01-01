// /api/license.ts
import { axiosInstance } from "./axiosInstance";

export const fetchDashboardData = async () => {
  const res = await axiosInstance.get("/license/user-license");
  return res.data;
};

export const createLicenseAPI = async (form: {
  productName: string;
  customer: string;
  duration: number;
}) => {
  const res = await axiosInstance.post("/license/create", form);
  return res.data;
};

// PATCH: toggle status (no userId or payload needed)
export const toggleLicenseStatus = async (licenseId: string) => {
  const res = await axiosInstance.patch(`/license/revoke/${licenseId}`);
  return res.data;
};
