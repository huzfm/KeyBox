import { axiosInstance } from "./axiosInstance"

export const createProject = async (data: {
     clientId: string
     projectName: string
     duration: number
     services: string[]
}) => {
     const res = await axiosInstance.post("/projects/createProject", data)
     return res.data
}
