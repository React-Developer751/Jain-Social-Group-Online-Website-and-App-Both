import { io, Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "@/axios/axios";

/**
 * Where the realtime server lives.
 *
 * Two things used to go wrong here.
 *
 * The socket fell back to EXPO_PUBLIC_BACKEND_URL, which ends in "/api". That
 * made it dial ".../api/socket.io/", a path the server does not serve, and
 * every attempt failed with "xhr poll error". The "/api" suffix is now
 * stripped, so a single configured URL is enough.
 *
 * And the scheme was rewritten from http to ws. socket.io opens with HTTP
 * polling before it upgrades, so handing it a ws:// URL fights its own
 * transport negotiation. It works out the right scheme by itself.
 */
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

const SOCKET_URL = (
  process.env.EXPO_PUBLIC_BACKEND_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "")
)
  .trim()
  .replace(/\/+$/, "");

let socket: Socket | null = null;
let isRefreshing = false;


const refreshAccessToken = async () => {
  try {
    // The server reads the refresh token from a cookie on the web and from the
    // body on mobile. This used to post an empty body, so on a phone there was
    // nothing to refresh with and the socket could never recover from an
    // expired token.
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    const res = await api.post("/user/auth/refresh", { refreshToken });

    const newToken = res.data.accessToken;
    await AsyncStorage.setItem("accessToken", newToken);

    // Refresh tokens rotate, so keep the replacement.
    if (res.data.refreshToken) {
      await AsyncStorage.setItem("refreshToken", res.data.refreshToken);
    }

    return newToken;
  } catch (error) {
    console.log("Refresh token failed");

    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");

    return null;
  }
};



/**
 * Opens the realtime connection, or reuses the one already open.
 *
 * Callers may pass the token they have just received. Reading it back from
 * AsyncStorage works too, but passing it removes any doubt about whether the
 * write has landed yet, which is what made this unreliable straight after a
 * social sign-in.
 */

/* ------------------------------------------------------------------ *
 * Live presence
 * ------------------------------------------------------------------ *
 *
 * Who is connected right now, kept in one place.
 *
 * Every screen used to read `isOnline` out of whatever the API returned when
 * the list was fetched, so a dot was only ever as fresh as the last request:
 * somebody coming online mid-session never lit up. The socket already tells us
 * about this in real time, so that is what the dots read from now.
 *
 * It lives in this module rather than in a screen because the listeners have
 * to be attached exactly once, when the socket is created, not once per screen
 * that happens to be mounted.
 */

const onlineUsers = new Set<string>();
const presenceListeners = new Set<() => void>();

/* A counter, not the set's size: one member going offline as another comes
   online leaves the size unchanged, and React would skip the re-render. */
let presenceVersion = 0;

const notifyPresence = () => {
  presenceVersion += 1;
  for (const listener of presenceListeners) listener();
};

/** Subscribe to presence changes. Returns an unsubscribe function. */
export const subscribePresence = (listener: () => void) => {
  presenceListeners.add(listener);
  return () => presenceListeners.delete(listener);
};

/** Is this member connected right now? */
export const isUserOnline = (userId?: string | null) =>
  Boolean(userId) && onlineUsers.has(String(userId));

/** Changes on every presence update, so React knows to re-render. */
export const getPresenceVersion = () => presenceVersion;

/** The live set. Read through `isUserOnline` rather than holding a reference. */
export const getOnlineUsers = () => onlineUsers;

const attachPresence = (target: Socket) => {
  // The full list arrives once, right after the handshake.
  target.on("onlineUsersList", (ids: string[]) => {
    onlineUsers.clear();
    for (const id of ids ?? []) onlineUsers.add(String(id));
    notifyPresence();
  });

  target.on("userOnline", (id: string) => {
    if (!id) return;
    onlineUsers.add(String(id));
    notifyPresence();
  });

  target.on("userOffline", (id: string) => {
    if (!id) return;
    onlineUsers.delete(String(id));
    notifyPresence();
  });

  // Our own connection dropping tells us nothing about anybody else, so clear
  // the list rather than leaving stale dots lit until we reconnect.
  target.on("disconnect", () => {
    onlineUsers.clear();
    notifyPresence();
  });
};

export const initSocket = async (tokenOverride?: string) => {
  if (!SOCKET_URL) {
    console.log("Socket URL is not configured. Set EXPO_PUBLIC_BACKEND_URL.");
    return null;
  }

  const token = tokenOverride ?? (await AsyncStorage.getItem("accessToken"));

  if (!token) {
    console.log("No token found, socket not started");
    return null;
  }

  if (socket) {
    // Always refresh the credentials before reconnecting: the socket may be
    // holding the token of a member who has since signed out.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, {
    // Read at every connection attempt, so a refreshed token is picked up
    // automatically on reconnect rather than replaying the expired one.
    auth: (cb: (data: Record<string, unknown>) => void) => {
      AsyncStorage.getItem("accessToken").then((current) => cb({ token: current ?? token }));
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    // Not Infinity: a phone retrying for ever against a server that is down
    // drains the battery and floods the log.
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    autoConnect: true
  });

  attachPresence(socket);

  socket.on("connect", () => {
    console.log("Socket connected", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", async (error: any) => {
    console.log("Socket error:", error?.message);

    if (error?.message?.includes("TokenExpired") && !isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken && socket) {
        socket.auth = { token: newToken };
        socket.disconnect();
        setTimeout(() => socket?.connect(), 500);
      }
    }
  });

  return socket;
};

export const getSocket = ()=>{
 return socket;
};



export const disconnectSocket=()=>{

 if(socket){

  socket.removeAllListeners();

  socket.disconnect();

  socket=null;

 }

};
