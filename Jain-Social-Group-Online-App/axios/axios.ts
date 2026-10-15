// import axios from "axios";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const base_url = process.env.EXPO_PUBLIC_BACKEND_URL;

// const axiosInstance = axios.create({
//   baseURL: base_url,
 
// });

// // REQUEST INTERCEPTOR
// axiosInstance.interceptors.request.use(
//   async (config) => {
//     try {
//       const token = await AsyncStorage.getItem("accessToken");

//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }

//       return config;
//     } catch (error) {
//       return Promise.reject(error);
//     }
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // RESPONSE INTERCEPTOR
// axiosInstance.interceptors.response.use(
//   (response) => response,

//   async (error) => {
//     const originalRequest = error.config;

//     if (
//       error.response?.status === 401 &&
//       !originalRequest._retry &&
//       !originalRequest.url?.includes("/login")
//     ) {
//       originalRequest._retry = true;

//       try {
//         const res = await axios.post(
//           `${base_url}/user/auth/refresh`,
//           {},
        
//         );

//         const newAccessToken = res.data.accessToken;

//         // SAVE NEW TOKEN
//         await AsyncStorage.setItem("accessToken", newAccessToken);

//         // UPDATE HEADER
//         originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

//         // RETRY ORIGINAL REQUEST
//         return axiosInstance(originalRequest);
//       } catch (err) {
//         // REMOVE TOKEN
//         await AsyncStorage.removeItem("accessToken");

//         // React Native me window.location nahi hota
//         // Yahan navigation use karna padega

//         return Promise.reject(err);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;












import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const base_url = process.env.EXPO_PUBLIC_BACKEND_URL;

const axiosInstance = axios.create({
  baseURL: base_url,
});

// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

// Endpoints that run BEFORE a session exists. A 401 from one of these is a
// real failure (bad credentials, rejected Apple / Google token, ...) and must
// be surfaced as-is - never turned into a token refresh, which would report the
// missing refresh token instead of the actual reason.
const UNAUTHENTICATED_ROUTES = [
  "/user/auth/login",
  "/user/auth/register",
  "/user/auth/google-mobile",
  "/user/auth/apple-mobile",
  "/user/auth/refresh",
  "/user/password/forgot-password",
  "/user/password/reset-password",
];

const isUnauthenticatedRoute = (url?: string) =>
  !!url && UNAUTHENTICATED_ROUTES.some((route) => url.includes(route));

/**
 * One refresh at a time, shared by everybody waiting on it.
 *
 * A screen asks for several things the moment it opens. When the access token
 * has expired they all come back 401 together, and each one used to post its
 * own refresh with the same stored token. The server rotates that token on
 * every use, so the first call consumes it and the rest present one that no
 * longer exists. They fail, each failure clears storage, and the member is
 * thrown back to the sign-in screen in the middle of using the app.
 *
 * Now the first 401 starts the refresh and the others await the same promise.
 * `null` means the session is genuinely over.
 */
let refreshPromise: Promise<string | null> | null = null;

const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (!refreshToken) return null;

      try {
        const res = await axios.post(`${base_url}/user/auth/refresh`, { refreshToken });
        const newAccessToken = res.data.accessToken as string;

        await AsyncStorage.setItem("accessToken", newAccessToken);

        // The server rotates the refresh token on every use: the one we just
        // sent is now dead. Storing the replacement is what keeps the session
        // alive past the first refresh.
        if (res.data.refreshToken) {
          await AsyncStorage.setItem("refreshToken", res.data.refreshToken);
        }

        return newAccessToken;
      } catch {
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

// RESPONSE INTERCEPTOR
axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isUnauthenticatedRoute(originalRequest.url)
    ) {
      originalRequest._retry = true;

      const newAccessToken = await refreshSession();

      // Nothing to refresh with, or the refresh was refused: report the
      // original error, so the caller sees why the request actually failed.
      if (!newAccessToken) return Promise.reject(error);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosInstance(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;