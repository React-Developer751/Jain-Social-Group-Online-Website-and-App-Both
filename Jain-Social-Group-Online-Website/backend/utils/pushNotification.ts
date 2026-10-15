import { Expo } from "expo-server-sdk";
import User from "../models/user.model.js";

const expo = new Expo();

/**
 * Every device a member is signed in on.
 *
 * `pushToken` was a single string, so a member who signed in on a second device
 * silently lost the first: only the newest one ever got a notification. Tokens
 * now live in a list, and the old field is read alongside it so records written
 * before the change keep working without a migration.
 */
export const pushTokensOf = (
  user: { pushToken?: string | null; pushTokens?: (string | null)[] } | null | undefined
): string[] => {
  const tokens = [...(user?.pushTokens ?? [])];
  if (user?.pushToken) tokens.push(user.pushToken);
  return [...new Set(tokens.filter((token): token is string => !!token))];
};

/** Matches members who have at least one device registered, old field or new. */
export const HAS_PUSH_TOKEN = {
  $or: [{ "pushTokens.0": { $exists: true } }, { pushToken: { $nin: [null, ""] } }],
};

/** The fields `pushTokensOf` needs. Pass to `.select()`. */
export const PUSH_TOKEN_FIELDS = "pushToken pushTokens";

/**
 * Forgets tokens Expo has told us are dead.
 *
 * A token stops working the moment the app is uninstalled, and Expo reports
 * that as `DeviceNotRegistered`. Nothing acted on it, so a token belonging to a
 * phone that no longer has the app stayed on the record for ever and every
 * later notification tried, and failed, to reach it.
 */
const forgetDeadTokens = async (tokens: string[]) => {
  if (tokens.length === 0) return;

  try {
    await User.updateMany(
      { pushTokens: { $in: tokens } },
      { $pull: { pushTokens: { $in: tokens } } }
    );
    await User.updateMany({ pushToken: { $in: tokens } }, { $unset: { pushToken: 1 } });
  } catch (err) {
    console.log("Push Error:", err);
  }
};

/**
 * Sends one notification to any number of devices.
 *
 * Expo refuses more than a hundred notifications in a single request, so the
 * list is cut into chunks by the library itself rather than sent one device at
 * a time, which for an announcement would be one round trip per member.
 *
 * A chunk that fails is logged and skipped: one unreachable device must not
 * cost everybody else their notification.
 */
export const sendPushNotificationToMany = async (
  pushTokens: (string | undefined | null)[],
  title: string,
  body: string,
  data?: any
) => {
  const messages = [...new Set(pushTokens.filter((token): token is string => !!token))]
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: "default" as const,
      title,
      body,
      data,
    }));

  if (messages.length === 0) return;

  const dead: string[] = [];

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      /* A ticket sits at the same index as the message it answers, which is the
         only way back from a rejection to the token that caused it. */
      tickets.forEach((ticket, index) => {
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          const token = chunk[index]?.to;
          if (typeof token === "string") dead.push(token);
        }
      });
    } catch (err) {
      console.log("Push Error:", err);
    }
  }

  await forgetDeadTokens(dead);
};

/** One device. Kept so existing callers read the same as they always did. */
export const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: any
) => sendPushNotificationToMany([pushToken], title, body, data);
