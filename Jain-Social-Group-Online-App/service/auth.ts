import api from "@/axios/axios";


export const registerUser = async(obj:any) => {
   const res  = await api.post(`/user/auth/register`, obj);
   return res;
};


/**
 * Ends the session on the server as well as on the device.
 *
 * Without this the refresh token stays valid for seven days after the member
 * taps Logout, so anyone who recovers it can walk straight back in.
 */
export const logoutUser = async(refreshToken?: string | null, pushToken?: string | null) => {
    /* The push token goes with it. The server keeps one token per device, and
       the device being signed out of must stop receiving this member's
       notifications — the member's other devices are unaffected. */
    const body: Record<string, string> = {};
    if (refreshToken) body.refreshToken = refreshToken;
    if (pushToken) body.pushToken = pushToken;

    const res = await api.post(`/user/auth/logout`, body);
    return res;
}


export const loginUser = async(obj:any) => {
    const res = await api.post(`/user/auth/login`, obj);
    return res;
}



export const updateUser = async (obj: any) => {
    const res = await api.put(`/user/auth/update`, obj, {
        headers: {
            "Content-Type": "multipart/form-data",
        }
    });
    return res;
}



export const getSingleUser = async (id:string) => {
    const res = await api.get(`/user/auth/getbyid/${id}`);
    return res;
}


/** One page of the member directory. See getAllPost for the cursor contract. */
export const getAllUser = async (userId:string, cursor?: string | null, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.append("cursor", cursor);
    const res = await api.get(`/user/auth/get/${userId}?${params.toString()}`);
    return res;
};

/**
 * Every member, by walking the cursor.
 *
 * The endpoint is paged so one request can never pull the whole table. Screens
 * that genuinely need the full list use this, with a page cap so a bug
 * upstream cannot spin here.
 */
export const getAllUsersPaged = async (userId: string, maxPages = 20) => {
    const collected: any[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < maxPages; page += 1) {
        const res: any = await getAllUser(userId, cursor);
        collected.push(...(res?.data?.data ?? []));

        if (!res?.data?.hasMore || !res?.data?.nextCursor) break;
        cursor = res.data.nextCursor;
    }

    return collected;
};



export const convertPremiumUser = async (obj: any) => {
    const res = await api.put(`/user/auth/convert-premium`, obj,
        {
            headers:{
                "Content-Type": "multipart/form-data",
            }
        }
    );
    return res;
};




export const getSingleUserDetail = async(id:string) => {
  const res = await api.get(`/user/auth/get-by-id/${id}`);
  return res;
};




export const deleteUserRequest = async(id:string) => {
    const res = await api.delete(`/user/auth/delete/user/${id}`);
    return res;
};


export const recoverAccount = async(id:string) => {
    const res = await api.patch(`/user/auth/recover/account/${id}`);
    return res;
}



export const addPushNotificationToken = async(obj:any) => {
    const res = await api.patch(`/user/auth/notification/pushToken`, obj);
    return res;
}



export const googleLogin = async (idToken:string, termsAccepted:boolean = true) => {
    // termsAccepted records the EULA agreement shown on the login screen
    // (App Store Guideline 1.2)
    const res = await api.post(`/user/auth/google-mobile`, { idToken, termsAccepted });
    return res;
}



export const appleLogin = async (obj:any) => {
    /**
     * Apple only sends fullName and email on the FIRST authorisation, so all
     * three are forwarded whenever they are present and the server keeps
     * whatever it already has otherwise.
     */
    const res = await api.post(`/user/auth/apple-mobile`, {
        identityToken: obj?.identityToken,
        firstName: obj?.firstName,
        lastName: obj?.lastName,
        email: obj?.email,
        termsAccepted: obj?.termsAccepted !== false,
    });
    return res;
}

/** Records EULA acceptance for an already signed-in member. */
export const acceptTerms = async (userId:string) => {
    const res = await api.post(`/user/auth/accept-terms`, { userId, accepted: true });
    return res;
}