import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, CreditCard as Edit, Check, X } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { getChatUsers, rejectGroupInvite, acceptGroupInvite } from "@/service/chat";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {  setBlankMessageList, setAcceptedInvite, setRejectGroupInvite, setUnreadCountRemove, setUserChatList, setRecoverUserChat, setDeleteUserChat } from '@/redux-toolkit/slice/chatSlice';
import { Alert } from "react-native";
import { getSocket } from '@/socket/socket';
import { SkeletonList } from "@/components/ui/Skeleton";
import { usePresence } from "@/hooks/usePresence";

export default function ChatScreen() {
  // Live presence, not the stale flag baked into the fetched list.
  const isOnline = usePresence();
 const { id } = useLocalSearchParams<{ id?: string }>();
  const chatListRef = useRef<FlatList>(null);
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  // True until the first chat list request settles, so the screen can tell
  // "still loading" apart from "you have no chats".
  const [loading, setLoading] = useState(true);
  const [rejectLoading, setRejectLoading] = useState<string | null>(null);
  const [acceptLoading, setAcceptLoading] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats');
  const userList = useAppSelector((state) => state?.chat?.userChatList);
  const [user, setUser] = useState<any | null>();
  const filteredChats = userList?.filter((item) => item?.isGroup === false && item.friend?.fullName?.toLowerCase().includes(search.toLowerCase()));
  const filteredGroups = userList?.filter((item) => item?.isGroup === true && item?.group?.title?.toLowerCase().includes(search.toLowerCase()));

  /* Group invitations waiting on this member. The chat list already carries
     each group's pending members, so this costs no extra request. */
  const pendingInviteCount = (userList ?? []).filter(
    (item: any) =>
      item?.isGroup &&
      item?.pendingMembers?.some((id: any) => String(id) === String(user?._id))
  ).length;
 const matchedChat = id
  ? filteredChats.find((chat) => chat?.friend?._id === id)
  : undefined;

  useEffect(() => {
  if (!id || !matchedChat) return;

  const index = filteredChats.findIndex(
    (chat) => chat?.friend?._id === id
  );

  if (index !== -1) {
    setTimeout(() => {
      chatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  }
}, [id, filteredChats, matchedChat]);

  const handleSeenMessages = async (chat: any) => {
    if(!socket) return;
    socket.emit("messageSeen", { chatId: chat?.chatId, receiverUserId: user?._id, senderUserId: chat?.friend?._id });
    socket.emit("getUnreadCount", user?._id);

    dispatch(setUnreadCountRemove({ chat }));
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("typingChat", () => {
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    });

    socket.on("groupInvite", (data) => {
      handleGetFriendList();
    })

    socket.on("groupInviteAccepted", (data) => {
      dispatch(setAcceptedInvite(data));
    })

    /* Presence is handled once in socket/socket.ts and read through
       usePresence(). Listening here as well meant this screen's cleanup
       removed the shared listeners on the way out. */

    socket.on("deleteUser", (user) => {
      dispatch(setDeleteUserChat(user));
    });

    socket.on("recoverUser", (user) => {
      dispatch(setRecoverUserChat(user));
    });

    return () => {
      socket.off("messageRefresh");
      socket.off("typingChat");
      socket.off("messageSeen");
      socket.off("userListUnReadChatCount");
      socket.off("groupInvite");
      socket.off("groupInviteAccepted");
      socket.off("deleteUser");
      socket.off("recoverUser");
    }
  }, [])

  const handleAcceptGroupInvite = async (chatId: string, userId: string) => {
    try {
      setAcceptLoading(chatId);
      const res = await acceptGroupInvite({ chatId, userId });
      if (res.status === 200 || res.status === 201) {
        dispatch(setAcceptedInvite({ chatId, userId }));
        Alert.alert("Group invite accepted successfully.", res?.data?.message);
      } else {
        Alert.alert("Failed to accept group invite", res?.data?.message || "invite accepted failed");
      }
    } catch (err: any) {
      console.log(err);
      Alert.alert("Failed to accept group invite", err?.response?.data?.message || err?.message);
    } finally {
      setAcceptLoading(null);
    }
  };

  const handleRejectGroupInvite = async (chatId: string, userId: string) => {
    try {
      setRejectLoading(chatId);
      const res = await rejectGroupInvite({ chatId, userId });
      if (res.status === 200 || res.status === 201) {
        Alert.alert("Group invite rejected successfully.", res?.data?.message);
        // setActiveChat(null);
        dispatch(setRejectGroupInvite({ chatId, userId }));
      } else {
        Alert.alert("Failed to reject group invite", res?.data?.message || "invite rejected failed");
      }
    } catch (err: any) {
      console.log(err);
      Alert.alert("Failed to reject group invite", err?.response?.data?.message || err?.message);
    } finally {
      setRejectLoading(null);
    }
  };


  const handleGetFriendList = async () => {
    const userData = await AsyncStorage.getItem("user");
    const userId = userData ? JSON.parse(userData)?._id : null;

    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await getChatUsers(userId);
      if (res.status === 200) {
        dispatch(setUserChatList(res?.data?.friends));
      }
    }
    catch (err) {
      console.log(err);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userList?.length === 0 || user?._id) {
      handleGetFriendList();
    }
  }, [user?._id]);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    getUser();
  }, [])
  const renderChat = ({ item }: any) => (
    <TouchableOpacity
      style={styles.chatRow}
      onPress={() => { dispatch(setBlankMessageList());handleSeenMessages(item); router.push({ pathname: '/chat/[id]', params: { id: item?.chatId } } as any) }} >
      <Avatar uri={item?.friend?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={54} isOnline={!item?.friend?.isDeleted && isOnline(item?.friend?._id)} />
      <View style={styles.chatInfo}>
        <View style={styles.chatTop}>
          <Text style={styles.chatName}>{item?.friend?.isDeleted ? "Deleted User" : item?.friend?.fullName}</Text>
          <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeActive]}>{new Date(item?.friend?.lastSeen)?.toLocaleString()} </Text>
        </View>
        <View style={styles.chatBottom}>
          <Text
            style={[styles.chatLast, item?.unread > 0 && styles.chatLastUnread]}
            numberOfLines={1}
          >
            {item?.isTyping ? (
              <Text style={styles.typingText}>typing...</Text>
            ) : (
              item?.lastMessage?.text
              // item?.lastMessage
            )}
          </Text>
          {item?.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item?.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );


  const renderGroupChat = ({ item }: any) => {
    const isPending = item?.pendingMembers?.some((id: string) => id.toString() === user?._id);
    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => { if (isPending) return; router.push({ pathname: '/chat/[id]', params: { id: item?.chatId }, } as any) }} >
        <Avatar uri={item?.group?.images?.[0]} size={54} />
    
        <View style={styles.chatInfo}>
          <View style={styles.chatTop}>
            <View style={styles.nameContainer}>
              <Text style={styles.chatName}>
                {item?.group?.title}
              </Text>
              {isPending && (
                <Text style={styles.pendingText}>
                  Are you interested in joining this group?
                </Text>
              )}
            </View>

            <Text
              style={[
                styles.chatTime,
                item?.unread > 0 && styles.chatTimeActive,
              ]}
            >
              {item?.timestamp}
            </Text>
          </View>

          <View style={styles.chatBottom}>
            <Text
              numberOfLines={1}
              style={[
                styles.chatLast,
                item?.unread > 0 && styles.chatLastUnread,
              ]}
            >
              {/* {item?.lastMessage} */}
            </Text>

            {isPending ? (
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() =>
                    handleAcceptGroupInvite(item?.chatId, user?._id)
                  }
                >
                  {acceptLoading === item?.chatId ? <ActivityIndicator color={Colors.white} /> : <Check size={16} color={Colors.success} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() =>
                    handleRejectGroupInvite(item?.chatId, user?._id)
                  }
                >
                  {rejectLoading === item?.chatId ? <ActivityIndicator color={Colors.white} /> : <X size={16} color={Colors.error} />}
                </TouchableOpacity>
              </View>
            ) : (
              item?.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item?.unread}</Text>
                </View>
              )
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Edit color={Colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionLabel, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }]}>
        {activeTab === 'chats' ? 'Recent Chats' : 'Groups'}
      </Text>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Search color={Colors.gray500} size={18} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.gray500}
        />
      </View>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
            Chats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]} >
            Groups
          </Text>
          {/* An invitation produced no count anywhere, so a member had to open
              this tab on the off chance that one was waiting. */}
          {pendingInviteCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingInviteCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <Text style={[styles.sectionLabel, { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }]}>
        Recent Chats
      </Text>
      {
        activeTab === 'chats' ? (
          <FlatList
          ref={chatListRef}
            data={filteredChats}
            renderItem={renderChat}
            keyExtractor={(item) => item?.chatId}
            ListEmptyComponent={() =>
              loading ? (
                <SkeletonList variant="row" count={6} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No chats yet</Text>
                  <Text style={styles.emptySubText}>Start a conversation from the member directory.</Text>
                </View>
              )
            }
          />
        ) : (
          <FlatList
            data={filteredGroups}
            renderItem={renderGroupChat}
            keyExtractor={(item) => item?.chatId}
            ListEmptyComponent={() =>
              loading ? (
                <SkeletonList variant="row" count={5} />
              ) : (
                <View style={styles?.emptyContainer}>
                  <Text style={styles?.emptyText}>No groups yet</Text>
                  <Text style={styles.emptySubText}>Group chats you are added to will appear here.</Text>
                </View>
              )
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },

  emptyText: {
    color: Colors.gray700,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubText: {
    color: Colors.gray500,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  pendingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingText: {
    color: Colors.gray500,
    fontSize: 12,
    marginTop: 2,
  },
  nameContainer: {
    flexShrink: 1,
  },

  acceptBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  rejectBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },

  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  activeTab: {
    backgroundColor: Colors.primary,
  },

  tabText: {
    color: Colors.gray400,
    fontWeight: '600',
  },

  activeTabText: {
    color: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
  },
  editBtn: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
  },
  onlineSection: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingBottom: 8,
  },
  sectionLabel: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  onlineUser: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  onlineName: {
    color: Colors.gray300,
    fontSize: Typography.fontSizes.xs,
    textAlign: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  chatInfo: { flex: 1 },
  chatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  chatTime: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.xs,
  },
  chatTimeActive: {
    color: Colors.primary,
  },
  chatBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatLast: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.base,
    flex: 1,
  },
  chatLastUnread: {
    color: Colors.gray700,
    fontWeight: Typography.fontWeights.medium,
  },
  typingText: {
    color: Colors.primary,
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
  },
});
