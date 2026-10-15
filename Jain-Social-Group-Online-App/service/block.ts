

import api from "@/axios/axios";



export const getBlockedUsers = async(userId:string) => {
    const res = await api.get(`/user/block/get/${userId}`);
    return res;
}



export const unblockedUser = async(obj:any) => {
    const res = await api.patch(`/user/block/unblocked`, obj);
    return res;
};


export const blockedUser = async(obj:any) => {
    const res = await api.patch(`/user/block/blocked`, obj);
    return res;
}