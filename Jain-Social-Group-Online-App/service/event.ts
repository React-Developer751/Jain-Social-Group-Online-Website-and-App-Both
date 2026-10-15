import api from "@/axios/axios";


//=====================================admin k liye hai y===========================================
//==================================================================================================


export const getEvent = async() =>{
    const res = await api.get(`/user/event/get`);
    return res;
};


export const getSingleEvent = async(id:string) =>{
    const res = await api.get(`/user/event/getbyid/${id}`);
    console.log("res", res);
    return res;
    
};


export const interestedOrNotInterestedFromEvent = async(obj:any) =>{
    const res = await api.post(`/user/event/candidate/interested`, obj);
    return res;
};

export const getLatestEvent = async() =>{
    const res = await api.get(`/user/event/latest`);
    return res;
};