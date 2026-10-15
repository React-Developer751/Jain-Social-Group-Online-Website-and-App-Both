import api from "@/axios/axios";


export const addReviews = async (obj: any) => {
    const res = await api.post(`/user/review/add`, obj);
    return res;
};

export const getReviews = async (id: string) => {
    const res = await api.get(`/user/review/get/${id}`);
    return res;
};

export const getGlobalReviews = async () => {
    const res = await api.get(`/user/review/get/global`);
    return res;
};


