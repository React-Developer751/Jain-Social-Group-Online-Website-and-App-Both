import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { Socket } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { AppProvider } from "@/context/AppContext";
import { store } from "@/redux-toolkit/store/store";
import { initSocket } from "@/socket/socket";
import { usePushNotifications } from "@/components/pushNotifications/pushNotification";
import { AppState } from "react-native";

export default function RootLayout() {
  useFrameworkReady();

  /* Registers this install for push once a session exists, and routes a
     tapped notification to the screen it is about. */
  usePushNotifications();
  const router = useRouter();
  const pathname = usePathname();

  const [socket, setSocket] = useState<Socket | null>(null);

  // =========================
  // SOCKET INITIALIZATION
  // =========================
  useEffect(() => {
  const initializeSocket = async () => {
    try {
      console.log("🔄 Initializing Socket...");

      // const token = await AsyncStorage.getItem("accessToken");

      // if (!token) {
      //   console.log("No token found, socket not initialized");
      //   return;
      // }

      const s = await initSocket();

      if (!s) return;

      setSocket(s);

      s.on("connect", () => {
        console.log("✅ SOCKET CONNECTED:", s.id);
      });

      s.on("connect_error", (err: any) => {
        console.log("❌ SOCKET ERROR:", err?.message);
      });

    } catch (error) {
      console.log("❌ SOCKET INIT ERROR:", error);
    }
  };

  initializeSocket();

}, []);

  // =========================
  // JOIN ROOM
  // =========================
  useEffect(() => {
    if (!socket) return;

    const joinUserRoom = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");

        const userId = userData
          ? JSON.parse(userData)?._id
          : null;

        if (!userId) return;

        const joinRoom = () => {
          console.log("🏠 Joining Room:", userId);

          socket.emit("joinRoom", userId);
        };

        if (socket.connected) {
          joinRoom();
        } else {
          socket.once("connect", joinRoom);
        }
      } catch (error) {
        console.log("❌ Join Room Error:", error);
      }
    };

    joinUserRoom();

    return () => {
      socket.off("connect");
    };
  }, [socket]);

  // =========================
  // LOGIN CHECK
  // =========================

  /**
   * Screens that must open on their own, whatever the session state.
   *
   * This redirect used to fire on every launch regardless of where the app was
   * opened, which meant a deep link went nowhere: tapping a password-reset
   * link on a phone landed on onboarding, so the reset could never be
   * completed from the app. Now only a launch at the root decides a
   * destination; anything else keeps the route it was opened with.
   */
  const OPEN_ROUTES = [
    "/onboarding",
    "/login",
    "/register",
    "/forgetPassword",
    "/newPassword",
    "/termsAndConditionsScreen",
    "/splash",
  ];

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        const isRoot = !pathname || pathname === "/" || pathname === "/index";
        const isOpenRoute = OPEN_ROUTES.some(
          (route) => pathname === route || pathname.startsWith(`${route}/`)
        );

        if (isRoot) {
          router.replace(token ? "/(tabs)" : "/onboarding");
          return;
        }

        // A deep link into the app without a session still needs sending to
        // sign-in, but a reset or registration link is left alone.
        if (!token && !isOpenRoute) {
          router.replace("/login");
        }
      } catch (error) {
        console.log("❌ Login Check Error:", error);
      }
    };

    checkLogin();
    // Runs once per launch. `pathname` is read, not depended on, so a later
    // navigation inside the app never re-triggers this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Provider store={store}>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="event/[id]" />
          <Stack.Screen name="profile/[id]" />
          <Stack.Screen name="directory" />
          <Stack.Screen name="announcements" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="review" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </AppProvider>
    </Provider>
  );
}