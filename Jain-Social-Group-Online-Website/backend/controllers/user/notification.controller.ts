import type { Request, Response } from "express";
import Notification, { NotificationType } from "../../models/notification.model.js";
import mongoose from "mongoose";
import { getIO } from "../../utils/socketHelper.js";
import Admin from "../../models/admin.model.js";
import User from "../../models/user.model.js";
import {
  sendPushNotificationToMany,
  pushTokensOf,
  HAS_PUSH_TOKEN,
  PUSH_TOKEN_FIELDS,
} from "../../utils/pushNotification.js";

export const createNotificationInternal = async (
  senderId: string | mongoose.Types.ObjectId,
  receiverId: string | mongoose.Types.ObjectId,
  type: NotificationType,
  postId?: string | mongoose.Types.ObjectId,
  message?: string
) => {
  if (!senderId || !receiverId || !type) {
    throw new Error("senderId, receiverId and type are required");
  }
  const io = getIO();

  const notificationData: any = {
    sender: senderId,
    receiver: receiverId,
    type,
    date: new Date(),
    status: type === "friend_request" ? "pending" : type === "friend_accept" ? "accepted" : type === "friend_cancel" ? "cancelled" : ""
  };

  if (postId) notificationData.post = postId;
  if (message) notificationData.message = message;


const notification = await Notification.create(notificationData);

await notification.populate([
  { path: "sender", select: "fullName profileImage" },
  { path: "receiver", select: "fullName profileImage" }
]);

let targetUserId: string;

if (type === "friend_request") {
  targetUserId = receiverId as string;
} 
else if ( type === "friend_accept" || type === "friend_cancel" || type === "like" || type === "comment") {
  targetUserId = senderId.toString();
} 
else { targetUserId = receiverId as string;}

if (type === "announcement" || type === "event") {
  io.emit("notification", notification);
}else if(type === "suggestion" || type === "new_user"){
  io.emit("adminNotification", notification);
}
 else {
  io.to(targetUserId).emit("notification", notification);
}

/* Who the push is for.
 *
 * An announcement or an event is addressed to nobody in particular: the admin
 * who creates it is stored as both sender and receiver. That id was then looked
 * up in the member collection, which never holds an admin, so the lookup found
 * nothing and not a single push went out. The broadcast reached only the people
 * who already had the app open, through the socket emit above.
 *
 * Those two go to every member instead, recognised by the same BROADCAST_TYPES
 * the member's own notification list uses, so the two halves cannot drift
 * apart. Everything else still has exactly one recipient and is unchanged. */
const pushTitle = "New Notification 🔔";
const pushBody = message || "You have a new activity";
const pushData = { type, senderId, postId };

if (BROADCAST_TYPES.includes(type)) {
  const recipients = await User.find({
    isDeleted: { $ne: true },
    ...HAS_PUSH_TOKEN,
  }).select(PUSH_TOKEN_FIELDS);

  await sendPushNotificationToMany(
    recipients.flatMap(pushTokensOf),
    pushTitle,
    pushBody,
    pushData
  );
} else {
  const pushTargetUserId = ["friend_accept","friend_cancel","like","comment"].includes(type) ? senderId : receiverId;
  const pushUser = await User.findById(pushTargetUserId).select(PUSH_TOKEN_FIELDS);

  // Every device the member is signed in on, not just the most recent one.
  await sendPushNotificationToMany(pushTokensOf(pushUser), pushTitle, pushBody, pushData);
}

return notification;
};













// ✅ CREATE Notification
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { sender, receiver, type, post, message } = req.body;

    if (!sender || !receiver || !type) {
      return res.status(400).json({
        success: false,
        message: "sender, receiver and type are required"
      });
    }

    const notification = await Notification.create({
      sender,
      receiver,
      type,
      post,
      message
    });

    res.status(201).json({
      success: true,
      data: notification
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ GET ALL Notifications (for logged-in user)
/**
 * Which notifications belong to this member.
 *
 * The field names read backwards for some types and that is the convention
 * the whole codebase follows: for a like, a comment, or a friend request being
 * accepted or cancelled, `sender` holds the person being told and `receiver`
 * holds the person who acted. Everything else is addressed to `receiver`, and
 * an announcement goes to everybody.
 *
 * One definition, used by both the list and the mark-as-read, so the two can
 * never disagree about who owns a row.
 */
const BROADCAST_TYPES = ["announcement", "event"];
const SENDER_IS_RECIPIENT = ["friend_accept", "friend_cancel", "like", "comment"];

/* Raised by a member's action but addressed to the administrators, and stored
   with that member on both sides. Without excluding them a member saw "user
   send a new Suggestion" and "New member registered. Please check member
   list" in their own bell. The old dropdown hid suggestions in the browser,
   which left them counted as unread and leaked the new-member ones anyway. */
const ADMIN_ONLY_TYPES = ["suggestion", "new_user"];

const recipientQuery = (userId: string | string[]) => ({
  type: { $nin: ADMIN_ONLY_TYPES },
  $or: [
    /* An announcement and a new event are club-wide. Both are stored with the
       admin as both sender and receiver and pushed to every socket, so the
       list has to recognise them by type. "event" used to be missing here,
       which meant a member saw it arrive and then lost it on the next
       refresh. */
    { type: { $in: BROADCAST_TYPES } },
    { type: { $in: SENDER_IS_RECIPIENT }, sender: userId },
    { type: { $nin: [...BROADCAST_TYPES, ...SENDER_IS_RECIPIENT] }, receiver: userId }
  ]
});

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    /* Ask the database for this member's rows instead of reading every
       notification ever created and filtering them in memory. The old version
       loaded the whole collection on every open of the bell, which is fine
       with a hundred rows and ruinous with a hundred thousand. */
    const notifications = await Notification.find(recipientQuery(userId))
      .populate("sender", "fullName profileImage")
      .populate("receiver", "fullName profileImage")
      .populate("post")
      .sort({ createdAt: -1 })
      // A dropdown shows recent activity, not the full history.
      .limit(Math.min(Number(req.query.limit) || 50, 100));

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount: await Notification.countDocuments({ ...recipientQuery(userId), isRead: false }),
      data: notifications,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ✅ GET Notification BY ID
export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id)
      .populate("sender", "fullName profileImage")
      .populate("post");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ UPDATE Notification (mark as read)
export const updateNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      data: updated
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



// ✅ DELETE Notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const updateAllNotifications = async(req:Request, res:Response) => {
  try{
      const userId = req.params.userId;
      if(!userId) return res.status(400).json({message : "userId is required."});

      const user = await User.findById(userId);
      if(!user) return res.status(404).json({message:"user not found."});

      /* Mark exactly the rows this member can see. Matching on `receiver`
         alone missed likes, comments and accepted requests, because for those
         types the recipient is held in `sender`. Their unread count could
         therefore never reach zero. */
      const notificationUpdated = await Notification.updateMany(
        { ...recipientQuery(userId), isRead: false },
        { $set: { isRead: true } }
      );

      res.status(200).json({ notificationUpdated })
  }
  catch(err:any){
    res.status(500).json({message:err?.message || "server error."});
  }
}