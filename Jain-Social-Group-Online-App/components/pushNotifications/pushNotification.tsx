import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { addPushNotificationToken } from "@/service/auth";

/**
 * Push notifications.
 *
 * The server has been ready for these all along: it stores a `pushToken` on
 * the member and sends a push on every notification it creates, guarded by
 * `if (pushToken)`. Nothing ever registered one, so that guard was always
 * false and no push was ever sent. This is the missing half.
 *
 * Three steps, in this order, and each one can fail harmlessly:
 * ask the member for permission, get an Expo token for this install, and hand
 * that token to the server. A member who declines simply gets no push; nothing
 * else in the app changes.
 */

/** How a notification behaves while the app is open and in front of you. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    // Quiet by default: a member reading the feed does not need a chime for
    // something already visible on screen.
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/** Where a tapped notification should take the member. */
const destinationFor = (data: Record<string, any> | undefined) => {
  switch (data?.type) {
    case "friend_request":
    case "friend_accept":
    case "friend_cancel":
      return "/friends";
    case "like":
    case "comment":
      /* The app has no single-post screen, so the notification list is as close
         to the post as it gets: it says who did what. The feed, where these
         used to land, says nothing about the notification at all. */
      return "/notification/[id]";
    case "announcement":
      return "/announcements";
    case "event":
      return "/(tabs)/events";
    case "message":
      /* The server names the conversation, so open it rather than the chat
         list: tapping "Ayush: see you at 6" should show that conversation.
         The chat list is the fallback when the id is missing. */
      return data?.chatId ? `/chat/${data.chatId}` : "/(tabs)/chat";
    default:
      return "/(tabs)";
  }
};

/**
 * Registers this install for push and tells the server about it.
 *
 * Returns the token, or null when push is unavailable: on a simulator, when
 * the member declines, or when the project id is missing from the build.
 * Every one of those is a normal outcome, not an error to show.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "android") {
      // Android 8 and later refuses to show a notification without a channel.
      await Notifications.setNotificationChannelAsync("default", {
        name: "Club notifications",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    // Only ask when we have not been told yet. Asking again after a refusal
    // does nothing on iOS and annoys people on Android.
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== "granted") {
      console.log("Push permission was not granted.");
      return null;
    }

    /* Permission is asked for on a simulator too, because that part works and
       is worth exercising. Only the token is impossible there: a simulator has
       no push service to register with, and asking for one throws. */
    if (!Device.isDevice) {
      console.log("Running on a simulator: permission handled, no push token issued.");
      return null;
    }

    /* The project id is what ties this token to this Expo project. It comes
       from app.json, and a build without it cannot produce a token. */
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("No EAS project id in this build, so no push token can be issued.");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    /* Send it only when it has changed. The token is stable for an install,
       so re-sending it on every launch is a request that achieves nothing. */
    const stored = await AsyncStorage.getItem("pushToken");

    if (stored !== token) {
      await addPushNotificationToken({ pushToken: token });
      await AsyncStorage.setItem("pushToken", token);
      console.log("Push token registered with the server.");
    }

    return token;
  } catch (error: any) {
    // Push is an extra. It must never stop somebody using the app.
    console.log("Push registration failed:", error?.message ?? error);
    return null;
  }
};

/** Clears the stored token so the next sign-in registers afresh. */
export const forgetPushToken = async () => {
  try {
    await AsyncStorage.removeItem("pushToken");
  } catch {
    // Nothing to do: the next registration will simply send the token again.
  }
};

/**
 * Registers on mount and routes taps.
 *
 * Mounted once at the root. It waits for a signed-in session, because the
 * token belongs to a member and the endpoint that stores it needs a token of
 * its own.
 */
export const usePushNotifications = () => {
  const tapListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken || cancelled) return;

      await registerForPushNotifications();
    };

    void register();

    const openFrom = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification?.request?.content?.data as Record<string, any> | undefined;
      if (!data) return;

      try {
        router.push(destinationFor(data) as any);
      } catch (error) {
        console.log("Could not open the notification's screen:", error);
      }
    };

    /* A tap that launched the app from closed is delivered before any listener
       can exist, so the listener alone misses it and the member lands on the
       feed wondering what the notification was about. This asks for that first
       response explicitly. The wait matters: the root layout decides a landing
       screen on every launch, so routing earlier than that is simply undone a
       moment later. This runs after it has settled. */
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response || cancelled) return;
        setTimeout(() => openFrom(response), 2000);
      })
      .catch(() => {
        // No launching notification. The ordinary listener below covers the rest.
      });

    // Tapping a notification while the app is already running opens the thing
    // it is about. The same payload the server already sends decides where.
    tapListener.current = Notifications.addNotificationResponseReceivedListener(openFrom);

    return () => {
      cancelled = true;
      tapListener.current?.remove();
    };
  }, []);
};

export default usePushNotifications;
