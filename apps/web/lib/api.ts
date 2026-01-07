import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// attach jwt automatically
api.interceptors.request.use((config) => {
  const jwt = Cookies.get("jwt");
  if (jwt) {
    config.headers.Authorization = `Bearer ${jwt}`;
  }
  return config;
});
