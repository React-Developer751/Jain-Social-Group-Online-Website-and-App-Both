import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, UserPlus, UserCheck, UserX, Users, Loader2 } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { FRIEND_REQUESTS, SUGGESTED_FRIENDS, USERS } from '@/data/dummyData';
import { getSuggestedUsers, sendRequest, pendingRequest, cancelRequest, acceptRequest, getFriendUsers } from "@/service/friendRequest";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addUserFromChat } from "@/service/chat";
import { getSocket } from '@/socket/socket';
import { SkeletonList } from "@/components/ui/Skeleton";
import { usePresence } from "@/hooks/usePresence";


const TABS = ['Requests', 'Suggestions', 'Friends'];

export default function FriendsScreen() {
  // Live presence, not the stale flag baked into the fetched list.
  const isOnline = usePresence();
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('Requests');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState(FRIEND_REQUESTS);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any>([]);
  /* One flag per tab, because each list has its own request. Without these the
     three tabs showed "no requests" / "no suggestions" / "list is empty" while
     their data was still on the way. */
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendListRefresh, setFriendListRefresh] = useState(false);
  const [sendRequestList, setSendRequestList] = useState([]);
  const [receivedRequestList, setReceivedRequestList] = useState([]);
  const [requestSubTab, setRequestSubTab] = useState<'sent' | 'received'>('received');
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState<string | null>(null);
  const [acceptLoading, setAcceptLoading] = useState<string | null>(null);
  const [friendList, setFriendList] = useState([]);
  const [addUserLoading, setAddUserLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    socket.on("unSeenFriendRequest", () => {
      handleGetFromAnToPendingRequest();
    });

    socket.on("deleteUser", (data) => {
      const userId = typeof data === "object" ? data?._id : data;

      setFriendList((prev:any) =>
        prev.filter((u:any) => u._id !== userId)
      );

      setSuggestedUsers((prev:any) =>
        prev.filter((u:any) => u._id !== userId)
      );

      setSendRequestList((prev:any) => prev.filter((u:any) => u._id !== userId));

      setReceivedRequestList((prev:any) => prev.filter((u:any) => u._id !== userId));
    });

    socket.on("recoverUser", (user) => {
      setFriendList((prev:any) =>
        prev.some((u:any) => u._id === user._id)
          ? prev
          : [...prev, user]
      );

      setSuggestedUsers((prev:any) =>
        prev.some((u:any) => u._id === user._id)
          ? prev
          : [...prev, user]
      );

      setSendRequestList((prev:any) =>
        prev.some((u:any) => u._id === user._id)
          ? prev
          : [...prev, user]
      );

      setReceivedRequestList((prev:any) =>
        prev.some((u:any) => u._id === user._id)
          ? prev
          : [...prev, user]
      );
    });

    return () => {
      socket.off("unSeenFriendRequest");
      socket.off("deleteUser");
      socket.off("recoverUser");
    }
  }, []);


  const handleAddUserFromChat = async (toId: string) => {
    const user = await AsyncStorage.getItem("user");
    const fromId = user ? JSON.parse(user)?._id : null;
    try {
      setAddUserLoading(toId);
      let obj = { senderId: fromId, receiverId: toId };
      const res = await addUserFromChat(obj);
      if (res.status === 200) {
        Alert.alert("Add user from chat successfully.", res?.data?.message);
        router.replace("/chat");
      }
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Add User Failed.", err?.response?.data?.message || err?.message);
    } finally {
      setAddLoading(null);
    }
  };

  const handleGetFriends = async () => {
    const user = await AsyncStorage.getItem("user");
    const userId = user ? JSON.parse(user)?._id : null;
    if (!userId) { setFriendsLoading(false); return; }
    try {
      const res = await getFriendUsers(userId);
      if (res.status === 200) {
        setFriendList(res?.data?.friends)
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
    finally {
      setFriendsLoading(false);
    }
  }
  const handlegetSuggestedUsers = async () => {
    const user = await AsyncStorage.getItem("user");
    const userId = user ? JSON.parse(user)?._id : null;
    if (!userId) { setSuggestionsLoading(false); return; }
    try {
      const res = await getSuggestedUsers(userId);
      if (res.status === 200) {
        setSuggestedUsers(res?.data);
        setFriendListRefresh(false);
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
    finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Suggestions" || friendListRefresh) {
      handlegetSuggestedUsers()
    }
    if (activeTab === "Requests" || friendListRefresh) {
      handleGetFromAnToPendingRequest();
    }
    if (activeTab === "Friends" || friendListRefresh) {
      handleGetFriends();
    }
  }, [activeTab, friendListRefresh]);


  const handleSendRequest = async (userId: string) => {
    const user = await AsyncStorage.getItem("user");
    const fromUserId = user ? JSON.parse(user)?._id : null;
    try {
      let obj = { fromId: fromUserId, toId: userId };
      setAddLoading(userId);
      const res = await sendRequest(obj);
      if (res.status === 201) {
        Alert.alert("Request send Successfully.", res?.data?.message);
        setFriendListRefresh(true);
        if (socket) {
          socket.emit("unSeenFriendRequest", { from: fromUserId, to: userId });
        }
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Request send failed.", err?.response?.data?.message || err?.message || "Request send Failed.");
    } finally {
      setAddLoading(null);
    }
  };

  const handleGetFromAnToPendingRequest = async () => {
    const user = await AsyncStorage.getItem("user");
    const userId = user ? JSON.parse(user)?._id : null;
    if (!userId) { setRequestsLoading(false); return; }
    try {
      const res = await pendingRequest(userId);
      if (res.status === 200) {
        setSendRequestList(res?.data?.sent?.length ? res.data.sent : []);
        setReceivedRequestList(res?.data?.received?.length ? res.data.received : []);
        setFriendListRefresh(false);
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
    finally {
      setRequestsLoading(false);
    }
  };


  const handleAcceptRequest = async (id: string) => {
    try {
      setAcceptLoading(id);
      const res = await acceptRequest(id);
      if (res.status === 200) {
        Alert.alert("Request Accept Successfully.", res?.data?.message);
        setFriendListRefresh(true);
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Request Accept Failed.", err?.response?.data?.message || err?.message);
    } finally {
      setAcceptLoading(null);
    }
  };

  const declineRequest = async (id: string) => {
    try {
      setCancelLoading(id);
      const res = await cancelRequest(id);
      if (res.status === 200) {
        Alert.alert("Request Cancel Successfully.", res?.data?.message);
        setFriendListRefresh(true);
      }
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Request Cancel Failed.", err?.response?.data?.message || err?.message);
    } finally {
      setCancelLoading(null);
    }
  };

  const renderRequest = ({ item }: any) => (
    <View style={styles.card}>
      <Avatar uri={item?.to?.profileImage || item?.from?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={56} isOnline={isOnline(item?.to?._id || item?.from?._id)} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item?.to?.fullName || item?.from?.fullName}</Text>
        <Text style={styles.cardHandle}>{item?.to?.fullName || item?.from?.fullName}</Text>
        <Text style={styles.mutualText}>{item?.mutualFriends || 0} mutual friends</Text>
        <Text style={styles.timestamp}>{new Date(item?.createdAt)?.toLocaleString()}</Text>
      </View>
      <View style={styles.requestActions}>
        {requestSubTab === "received" ? <> <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleAcceptRequest(item._id)}
        >
          {acceptLoading === item?._id ? <ActivityIndicator color="white" /> : <><UserCheck color={Colors.white} size={16} />
            <Text style={styles.acceptBtnText}>Accept</Text></>}
        </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => declineRequest(item._id)}
          >
            <UserX color={Colors.gray400} size={16} />
          </TouchableOpacity> </>
          :
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => declineRequest(item._id)}
          >
            {cancelLoading === item?._id ? <ActivityIndicator color="white" /> : <UserX color={Colors.gray400} size={16} />}
          </TouchableOpacity>
        }
      </View>
    </View>
  );

  const renderSuggestion = ({ item }: any) => (
    <View style={styles.card}>
      <Avatar uri={item?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={56} isOnline={isOnline(item?._id)} />
      <View style={[styles.cardInfo, { flex: 1 }]}>
        <Text style={styles.cardName}>{item?.fullName}</Text>
        <Text style={styles.cardHandle}>{item?.fullName}</Text>
        <Text style={styles.mutualText}>{item?.mutualFriends || 0} mutual friends</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => { handleSendRequest(item?._id) }}>
        {addLoading === item?._id ? <ActivityIndicator color="white" /> : <><UserPlus color={Colors.primary} size={16} />
          <Text style={styles.addBtnText}>Add</Text></>}
      </TouchableOpacity>
    </View>
  );

  const renderFriend = ({ item }: any) => (
    <View style={styles.card}>
      <Avatar uri={item?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={52} isOnline={isOnline(item?._id)} />
      <View style={[styles.cardInfo, { flex: 1 }]}>
        <Text style={styles.cardName}>{item?.fullName}</Text>
        <Text style={styles.cardHandle}>{item?.fullName}</Text>
        <Text style={[styles.onlineStatus, isOnline(item?._id) ? styles.onlineText : styles.offlineText]}>
          {isOnline(item?._id) ? 'Online' : 'Offline'}
        </Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity style={styles.msgBtn} onPress={() => { handleAddUserFromChat(item?._id) }}>
          {addUserLoading === item?._id ? <ActivityIndicator color={"white"} /> : <Text style={styles.msgBtnText}>Message</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.light.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerRight}>
          <Users color={Colors.gray600} size={22} />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Search color={Colors.gray500} size={18} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search friends..."
          placeholderTextColor={Colors.gray500}
        />
      </View>

      <View style={styles.tabsBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {tab === 'Requests' && receivedRequestList?.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{receivedRequestList?.length}</Text>
              </View>
            )}
          </TouchableOpacity> 
        ))}
      </View>

      {activeTab === 'Requests' && (
        <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 10 }}>

          <TouchableOpacity
            onPress={() => setRequestSubTab('received')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: requestSubTab === 'received' ? Colors.primary : Colors.white,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: requestSubTab === 'received' ? Colors.white : Colors.gray700 }}>Received</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRequestSubTab('sent')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: requestSubTab === 'sent' ? Colors.primary : Colors.white,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: requestSubTab === 'sent' ? Colors.white : Colors.gray700 }}>Sent</Text>
          </TouchableOpacity>

        </View>
      )}

      {activeTab === 'Requests' && (
        <FlatList
          data={requestSubTab === 'sent' ? sendRequestList : receivedRequestList}
          keyExtractor={(r: any) => r._id}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            requestsLoading ? (
              <SkeletonList variant="row" count={4} />
            ) : (
              <View style={styles.emptyState}>
                <UserCheck color={Colors.gray600} size={56} />
                <Text style={styles.emptyTitle}>No pending requests</Text>
                <Text style={styles.emptySubtitle}>You're all caught up!</Text>
              </View>
            )
          }
        />
      )}
      {activeTab === 'Suggestions' && (
        <FlatList
          data={suggestedUsers}
          keyExtractor={s => s._id}
          renderItem={renderSuggestion}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
           ListEmptyComponent={
            suggestionsLoading ? (
              <SkeletonList variant="row" count={5} />
            ) : (
              <View style={styles.emptyState}>
                <UserCheck color={Colors.gray600} size={56} />
                <Text style={styles.emptyTitle}>No more suggestions</Text>
                <Text style={styles.emptySubtitle}>
                  Check back later to discover new people.
                </Text>
              </View>
            )
           }
        />
      )}
      {activeTab === 'Friends' && (
        <FlatList
          data={friendList}
          keyExtractor={(u: any) => u._id}
          renderItem={renderFriend}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
           ListEmptyComponent={
            friendsLoading ? (
              <SkeletonList variant="row" count={5} />
            ) : (
              <View style={styles.emptyState}>
                <UserCheck color={Colors.gray600} size={56} />
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptySubtitle}>
                  Send friend requests to start connecting with others.
                </Text>
              </View>
            )
           }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: Colors.light.text, fontSize: Typography.fontSizes['2xl'], fontWeight: Typography.fontWeights.bold },
  headerRight: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: { flex: 1, color: Colors.light.text, fontSize: Typography.fontSizes.base },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.medium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.fontWeights.semibold },
  tabBadge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: Colors.white, fontSize: 10, fontWeight: Typography.fontWeights.bold },
  listContent: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 12,
  },
  cardInfo: { flex: 1 },
  cardName: { color: Colors.light.text, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold, marginBottom: 2 },
  cardHandle: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, marginBottom: 4 },
  mutualText: { color: Colors.gray500, fontSize: Typography.fontSizes.xs },
  timestamp: { color: Colors.gray500, fontSize: Typography.fontSizes.xs, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  acceptBtnText: { color: Colors.white, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: Colors.primary, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  onlineStatus: { fontSize: Typography.fontSizes.xs, marginTop: 2 },
  onlineText: { color: Colors.success },
  offlineText: { color: Colors.gray500 },
  friendActions: {},
  msgBtn: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  msgBtnText: { color: Colors.primary, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: Colors.light.text, fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.semibold },
  emptySubtitle: { color: Colors.gray600, fontSize: Typography.fontSizes.base },
});
