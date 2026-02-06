import axios from "axios";
import Cookies from "js-cookie";

export const api = axios.create({
       baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
       const jwt = Cookies.get("jwt");
       if (jwt) {
              config.headers.Authorization = `Bearer ${jwt}`;
       }
       return config;
});

api.interceptors.response.use(
       (response) => response,
       (error) => {
              if (error.response?.status === 401) {
                     Cookies.remove("jwt");
                     if (typeof window !== "undefined") {
                            window.location.href = "/login";
                     }
              }
              return Promise.reject(error);
       },
);
