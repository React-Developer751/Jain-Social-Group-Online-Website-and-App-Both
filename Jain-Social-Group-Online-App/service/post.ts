
import api from "@/axios/axios";


//======================================user k liye hai y=========================================
//================================================================================================


export const addNotes = async(obj:any) =>{
    const res = await api.post(`/user/post/notes/add`, obj,
    );
    return res;
};


export const likeAnUnLikePost = async(obj:any) =>{
    const res = await api.post(`/user/post/like/toggle`, obj,
    );
    return res;
};


export const addCommentPost = async(obj:any) =>{
    const res = await api.post(`/user/post/comment/add`, obj,
    );
    return res;
};


export const likeAnUnLikeComment = async(obj:any) =>{
    const res = await api.post(`/user/post/comment/like-toggle`, obj,
    );
    return res;
};


export const replyToComment = async(obj:any) =>{
    const res = await api.post(`/user/post/comment/reply`, obj,
    );
    return res;
};



export const sharePost = async(obj:any) =>{
    const res = await api.post(`/user/post/share`, obj,
    );
    return res;
};



export const deletePostByUser = async(obj:any) =>{
    const res = await api.put(`/user/post/delete`, obj,
    );
    return res;
}


//=====================================admin k liye hai y===========================================
//==================================================================================================




export const addPost = async(obj:any) =>{
    const res = await api.post(`/user/post/add`, obj,
          { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res;
};


/**
 * One page of the feed.
 *
 * The server returns 20 posts plus a `nextCursor`. Pass that cursor back for
 * the next page; omit it to start from the top.
 */
export const getAllPost = async(userId:string, cursor?: string | null, limit = 20) =>{
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append("cursor", cursor);
    const res = await api.get(`/user/post/get/${userId}?${params.toString()}`);
    return res;
};



export const updatePost = async(obj:any) =>{
    const res = await api.put(`/user/post/update`, obj,
          { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res;
};


// =====================================
// Content filtering (App Store Guideline 1.2)
// Hide a single post from my own feed, without waiting for a moderator.
// =====================================

export const hidePost = async (obj:{userId:string; postId:string}) => {
    const res = await api.post(`/user/post/hide`, obj);
    return res;
};

export const unhidePost = async (obj:{userId:string; postId:string}) => {
    const res = await api.post(`/user/post/unhide`, obj);
    return res;
};
