import { axiosInstance } from "./axiosInstance"

export const fetchDashboard = async (clientId?: string) => {
     const res = await axiosInstance.get("/dashboard", {
          params: { clientId },
     })
     return res.data
}
