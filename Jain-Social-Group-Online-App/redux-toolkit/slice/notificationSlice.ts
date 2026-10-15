import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Notification {
    notificationList: any[];
    unreadCount: number;
}
const initialState: Notification = {
    notificationList: [],
    unreadCount: 0,
};


const notificationSlice = createSlice({
    name: "Notification",
    initialState,
    reducers: {
        /* The list is a page, not the whole history, so counting unread rows
           inside it under-reports once a member has more notifications than
           one page holds. The server sends the true count; use it when it is
           there and fall back to counting for older servers. */
        setNotificationList: (state, action: PayloadAction<any[] | { data: any[]; unreadCount?: number }>) => {
            const payload = action.payload as any;
            const list: any[] = Array.isArray(payload) ? payload : (payload?.data ?? []);

            state.notificationList = list;
            state.unreadCount =
                !Array.isArray(payload) && typeof payload?.unreadCount === "number"
                    ? payload.unreadCount
                    : list.filter((n) => !n.isRead).length;
        },

        setNewNotification: (state, action: PayloadAction<any>) => {
            const existNotification = state.notificationList.find((n) => n?._id === action.payload?._id);
            if (!existNotification) {
                state.notificationList.unshift(action.payload);

                if (!action.payload.isRead) {
                    state.unreadCount += 1;
                }
            }
        },

        markAllAsRead: (state) => {
      state.notificationList.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },

   markNotificationsAsReadByReceiver: (state, action) => {
  const receiverId = action.payload;

  state.notificationList.forEach((notif: any) => {
    const notifReceiverId = String(
      notif.receiver?._id || notif.receiver
    );

    if (notifReceiverId === String(receiverId)) {
      notif.isRead = true;
    }
  });
},
    }
});

export const { setNotificationList,markNotificationsAsReadByReceiver, markAllAsRead, setNewNotification } = notificationSlice.actions;

export default notificationSlice.reducer;

