import { axiosInstance } from "./axiosInstance"

export const fetchUserProfileWithLicenses = async () => {
     const res = await axiosInstance.get("/license/user-license")
     return res.data
}

export const createLicenseAPI = async (data: {
     clientId: string
     projectId: string
     duration: number
     services?: string[]
}) => {
     const res = await axiosInstance.post("/license/create", data)
     return res.data
}

export const toggleLicenseStatus = async (key: string) => {
     const res = await axiosInstance.patch(`/license/revoke/${key}`)
     return res.data
}
