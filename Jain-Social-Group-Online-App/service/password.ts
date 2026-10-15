import api from "@/axios/axios";


export const forgetPassword = async(identifier:string) => {
    const res = await api.post(`/user/password/forgot-password`, { identifier, platform : "mobile" });
    return res;
};


export const updatePassword = async(token:string, newPassword:string) => {
    const res = await api.post(`/user/password/reset-password`, { token, newPassword });
    return res;
};