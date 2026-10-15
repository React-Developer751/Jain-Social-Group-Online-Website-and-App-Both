import axios from "axios";

/**
 * Where the API lives.
 *
 * When the API also serves this build — the single-service deployment — the
 * two share an origin and "/api" is correct. Falling back to it means the app
 * still works if VITE_BACKEND_URL is not set at build time, which is easy to
 * miss because .env files are not committed and the host supplies its own.
 * Set VITE_BACKEND_URL when the API is on a different origin.
 */
const base_url = import.meta.env.VITE_BACKEND_URL || "/api";

const axiosInstance = axios.create({
  baseURL: base_url,
  withCredentials: true
});


// REQUEST INTERCEPTOR
axiosInstance.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem("admin.accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;

  },
  (error) => {
    return Promise.reject(error);
  }
);


/** Where this app sends somebody whose session has ended. */
const SIGN_IN_PATH = "/admin/login";
/**
 * Endpoints that run BEFORE a session exists.
 *
 * A 401 from one of these is a real answer — wrong password, expired reset
 * link — not an expired session. Treating it as one made a wrong password
 * trigger a token refresh, and the failed refresh then redirected the person
 * away from the page they were signing in on.
 */
const UNAUTHENTICATED_ROUTES = [
  "/user/auth/login",
  "/user/auth/register",
  "/user/auth/refresh",
  "/user/auth/google-mobile",
  "/user/auth/apple-mobile",
  "/user/password/forgot-password",
  "/user/password/reset-password",
  "/admin/auth/login"
];

const isUnauthenticatedRoute = (url?: string) =>
  !!url && UNAUTHENTICATED_ROUTES.some((route) => url.includes(route));

/**
 * One refresh at a time, shared by everybody waiting on it.
 *
 * The dashboard loads several panels at once. When the access token has
 * expired they all come back 401 together, and each used to post its own
 * refresh. The server rotates the refresh token on every use, so the first
 * call consumes it and the rest present one that no longer exists. They fail,
 * each clears storage and redirects, and the administrator is thrown back to
 * the sign-in page mid-session.
 *
 * The endpoint is the shared one: it reads the token type and handles admin
 * and member accounts alike.
 */
let refreshPromise: Promise<string> | null = null;

const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${base_url}/user/auth/refresh`,
        // Cookie first on the server, body as the fallback for a split origin.
        { refreshToken: localStorage.getItem("admin.refreshToken") || undefined },
        { withCredentials: true }
      )
      .then((res) => {
        const token = res.data.accessToken as string;
        localStorage.setItem("admin.accessToken", token);
        if (res.data.refreshToken) localStorage.setItem("admin.refreshToken", res.data.refreshToken);
        return token;
      })
      .finally(() => {
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
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isUnauthenticatedRoute(originalRequest?.url)
    ) {
      return Promise.reject(error);
    }

    // Nothing to refresh with: there was no session to expire, so report the
    // original failure rather than bouncing the page.
    if (!localStorage.getItem("admin.accessToken")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshSession();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosInstance(originalRequest);
    } catch (err) {
      localStorage.removeItem("admin.accessToken");
      localStorage.removeItem("admin.user");

      // Back to THIS app's sign-in page. The admin dashboard is served under
      // /admin, so sending it to /login dropped an administrator onto the
      // member app's sign-in screen.
      if (!window.location.pathname.startsWith(SIGN_IN_PATH)) {
        window.location.href = SIGN_IN_PATH;
      }

      return Promise.reject(err);
    }
  }
);

export default axiosInstance;
