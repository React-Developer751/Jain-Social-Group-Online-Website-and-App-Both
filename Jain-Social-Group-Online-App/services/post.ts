import api from "@/axios/axios";

export const getAllPost = async () => {
    try {
        const res = await api.get(`/user/post/get`);
        return res;
    } catch (error: any) {
        console.error("Error fetching posts:", error);
        throw error;
    }
};
