import  api  from "@/axios/axios";


// =====================================
// Create Report
// =====================================

export const createReport = async (obj:any) => {

    const res = await api.post(`/user/report/create`, {

        reportedBy: obj?.reportedBy,

        reportedUser: obj?.reportedUser,

        reportType: obj?.reportType,

        reportedItemId: obj?.reportedItemId,

        reason: obj?.reason,

        description: obj?.description,

    });

    return res;

};





// =====================================
// Get My Reports
// =====================================

export const getMyReports = async (userId:string) => {

    const res = await api.get(`/user/report/my/${userId}`);

    return res;

};