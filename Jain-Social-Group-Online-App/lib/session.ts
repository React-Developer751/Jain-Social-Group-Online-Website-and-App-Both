import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { logoutUser } from "@/service/auth";
import { disconnectSocket, getSocket } from "@/socket/socket";

/**
 * The one way out of the app.
 *
 * Three separate logout handlers each did something different and each got it
 * partly wrong: one removed only the access token and left the refresh token
 * and the member's stored profile behind, and two bailed out entirely when the
 * socket happened to be disconnected, so tapping Logout did nothing at all.
 *
 * The order matters. Everything that can fail is attempted first and its
 * failure ignored, then local state is cleared unconditionally. Signing out
 * locally must happen even if the network is down.
 */
export const signOut = async () => {
  const refreshToken = await AsyncStorage.getItem("refreshToken").catch(() => null);
  const pushToken = await AsyncStorage.getItem("pushToken").catch(() => null);
  const userRaw = await AsyncStorage.getItem("user").catch(() => null);
  const userId = userRaw ? (JSON.parse(userRaw)?._id as string | undefined) : undefined;

  // Tell the server, so the refresh token stops working straight away.
  try {
    await logoutUser(refreshToken, pushToken);
  } catch {
    // A failed call must not trap the member in a signed-in state.
  }

  // Mark offline, then close the socket.
  try {
    const socket = getSocket();
    if (socket?.connected && userId) socket.emit("userOffline", userId);
  } catch {
    // The socket may already be gone.
  }

  try {
    disconnectSocket();
  } catch {
    // Same.
  }

  try {
    await GoogleSignin.signOut();
  } catch {
    // Only meaningful when the member signed in with Google.
  }

  /* Forget the cached push token too. It stays valid for this install, but
     the next member to sign in on this phone must register it against their
     own account, and the cache is what decides whether we bother to send it. */
  // Unconditional, and last: nothing above may prevent it.
  await AsyncStorage.multiRemove(["accessToken", "refreshToken", "user", "pushToken"]).catch(async () => {
    await AsyncStorage.clear().catch(() => undefined);
  });
};

export default signOut;
