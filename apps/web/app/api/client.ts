import { axiosInstance } from "./axiosInstance"

export const createClient = async (data: { name: string; email: string }) => {
     const res = await axiosInstance.post("/clients", data)
     return res.data
}
