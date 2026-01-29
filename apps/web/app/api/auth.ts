import { axiosInstance } from "./axiosInstance";

export const signupUser = async (data: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}) => {
  const res = await axiosInstance.post("/auth/signup", {
    ...data,
    confirm_password: data.confirmPassword,
  });
  return res.data;
};

export const loginUser = async (data: { email: string; password: string }) => {
  const res = await axiosInstance.post("/api/v1/auth/login", data);
  return res.data;
};

export const createLicense = async (data: {
  productName: string;
  customer: string;
  duration: number;
}) => {
  const res = await axiosInstance.post("/api/v1/license/create", data);
  return res.data;
};
