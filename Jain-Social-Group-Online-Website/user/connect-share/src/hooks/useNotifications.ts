import { useCallback, useEffect, useState } from "react";
import socket from "@/socket/socket";
import { getAllNotifications, UpdateNotifications } from "@/service/notification";

/**
 * The member's notification list, kept live.
 *
 * The server has been writing notifications all along and nothing in the web
 * app ever read them. The navigation bar only carried counters, and those
 * counters lived in memory: they started at zero on every page load and only
 * grew from events that arrived while the tab was open. So anything that
 * happened while the member was away was lost, which is exactly when a
 * notification is worth having.
 *
 * This loads the stored list once, then keeps it current from the socket.
 */

export interface NotificationItem {
  _id: string;
  type: string;
  message?: string;
  isRead?: boolean;
  status?: string;
  date?: string;
  createdAt?: string;
  sender?: { _id: string; fullName?: string; profileImage?: string };
  receiver?: { _id: string; fullName?: string; profileImage?: string };
  post?: { _id: string } | string;
}

export const useNotifications = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const userId = (() => {
    try {
      return JSON.parse(localStorage.getItem("member.user") || "null")?._id as string | undefined;
    } catch {
      return undefined;
    }
  })();

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const res = await getAllNotifications(userId);
      const list: NotificationItem[] = res?.data?.data ?? [];
      setItems(list);
      /* Trust the server's count when it sends one. It counts rows this
         member can see, which is not the same as the rows in this page of
         the list. */
      setUnread(res?.data?.unreadCount ?? list.filter((n) => !n.isRead).length);
    } catch {
      // A failed load leaves the bell empty rather than breaking the header.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onNotification = (incoming: NotificationItem) => {
      if (!incoming?._id) return;

      setItems((prev) => {
        // The socket can repeat a delivery on reconnect.
        if (prev.some((n) => n._id === incoming._id)) return prev;
        return [incoming, ...prev].slice(0, 50);
      });
      setUnread((count) => count + 1);
    };

    socket.on("notification", onNotification);

    return () => {
      // Named, so this removes only this listener and leaves other screens'
      // handlers for the same event alone.
      socket.off("notification", onNotification);
    };
  }, []);

  /** Called when the dropdown opens. Clears the badge for good, not just here. */
  const markAllRead = useCallback(async () => {
    if (!userId || unread === 0) return;

    // Clear first: the badge should go the moment the list is on screen.
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await UpdateNotifications(userId);
    } catch {
      // The badge comes back on the next load if the server did not record it.
    }
  }, [userId, unread]);

  return { items, unread, loading, markAllRead, reload: load };
};

export default useNotifications;
