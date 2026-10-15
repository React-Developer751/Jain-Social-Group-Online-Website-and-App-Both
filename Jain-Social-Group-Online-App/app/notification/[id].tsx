import { useState } from "react";
import React, { useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { router } from "expo-router";
import {
  markAllAsRead,
  setNotificationList,
} from "@/redux-toolkit/slice/notificationSlice";
import { getAllNotifications } from "@/service/notification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Typography } from "@/constants/theme";
import { ArrowLeft } from "lucide-react-native";
import { SkeletonList } from "@/components/ui/Skeleton";

export default function NotificationPage() {
  const dispatch = useDispatch();

  const notifications = useSelector(
    (state: any) => state.notification.notificationList
  );

  /* True until the first request settles, so the screen does not announce
     "no notifications" before it has looked. */
  const [listLoading, setListLoading] = useState(true);

  const handleGetAllNotifications = async () => {
    const userData = await AsyncStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;

    if (!user?._id) { setListLoading(false); return; }

    try {
      const res = await getAllNotifications(user?._id);

      if (res.status === 200) {
        // Pass the envelope so the badge can use the server's own unread count.
        dispatch(setNotificationList({ data: res?.data?.data ?? [], unreadCount: res?.data?.unreadCount }));
      }
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    dispatch(markAllAsRead());
    handleGetAllNotifications();
  }, []);

  const getText = (item: any) => {
    switch (item.type) {
      case "like":
        return `${item?.message}`;
      case "comment":
        return `${item?.message}`;
      case "friend_request":
        return `$${item?.message}`;
      case "friend_accept":
        return `${item?.message}`;
      case "message":
        return `${item?.message}`;
      case "event":
        return `${item?.message}`;
      case "announcement":
        return `${item?.message}`;
      default:
        return item.message || "New notification";
    }
  };

  const handlePress = (item: any) => {
    switch (item.type) {
      case "friend_request":
        router.push("/friends");
        break;

      case "message":
        router.push(`/chat/${item.sender?._id}`);
        break;

      case "event":
        router.push(`/event/${item.post}`);
        break;

      case "announcement":
        router.push("/announcements");
        break;
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => handlePress(item)}
      style={[
          styles.itemContainer,
          {
            backgroundColor: item.isRead ? Colors.white : Colors.gray50,
          },
        ]}
    >
      {/* Avatar */}
      <View style={styles.avatar} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.text}>{getText(item)}</Text>

        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
    {/* Header */}
<View style={styles.headerRow}>
  
  {/* Back Button */}
  <TouchableOpacity
    onPress={() => router.replace("/(tabs)")}
    style={styles.backBtn}
  >
    <ArrowLeft size={22} color={Colors.gray900} />
  </TouchableOpacity>

  {/* Title */}
  <Text style={styles.headerText}>
    Notifications
  </Text>

  {/* Right spacer (for proper alignment) */}
  <View style={{ width: 40 }} />
</View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          listLoading ? (
            <SkeletonList variant="row" count={5} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No notifications yet
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: 40,
  },
 
headerRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: Colors.gray100,
},

backBtn: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: Colors.gray50,
  alignItems: "center",
  justifyContent: "center",
  marginRight: 10,
},

backText: {
  color: Colors.white,
  fontSize: 26,
  fontWeight: "bold",
  marginTop: -2,
},

  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },

  headerText: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },

  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.gray50,
    marginRight: 12,
  },

  content: {
    flex: 1,
  },

  text: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },

  time: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.xs,
    marginTop: 4,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },

  emptyText: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.sm,
  },
});