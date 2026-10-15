import type { Request, Response } from "express";
import Notification, { NotificationType } from "../../models/notification.model.js";
import mongoose from "mongoose";
import { getIO } from "../../utils/socketHelper.js";
import Admin from "../../models/admin.model.js";


/**
 * The administrators' notifications: suggestions and new members.
 *
 * This used to load every notification ever written, unfiltered and
 * unlimited, and the browser then threw away all but these two kinds. That
 * collection gains a row for every like and every comment in the club, so
 * what costs nothing today becomes tens of thousands of documents fetched
 * and populated on each open of the bell. The filter and the cap belong on
 * the database, which is also where the index can help.
 */
export const  getAllNotifications = async(req:Request, res:Response) => {
    try{
       const adminTypes = [NotificationType.SUGGESTION, NotificationType.NEW_USER];

       const notifications = await Notification.find({ type: { $in: adminTypes } })
       .populate("sender", "fullName profileImage")
       .populate("receiver", "fullName profileImage")
       .sort({ createdAt: -1 })
       .limit(Math.min(Number(req.query.limit) || 50, 100));

       res.status(200).json({
         data: notifications,
         unreadCount: await Notification.countDocuments({ type: { $in: adminTypes }, isRead: false })
       });

    }
    catch(err:any){
        res.status(500).json({message:err?.message});
    }
} 