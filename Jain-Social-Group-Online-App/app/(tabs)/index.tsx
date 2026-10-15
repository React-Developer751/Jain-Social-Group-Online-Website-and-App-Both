import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, RefreshControl, Image, Modal, ScrollView, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Bell, Search, Users,FileText, MessageCircle, Grid2x2 as Grid, LogOut, Megaphone, Calendar, ChevronDown, Image as ImageIcon, Video, Send, BadgeCheck, User, SquareActivity } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';

const topIcons = [
  { icon: Users, label: 'Friends', route: '/friends' },
  { icon: Grid, label: 'Directory', route: '/directory' },
  { icon: Megaphone, label: 'News', route: '/announcements' },
  { icon: Users, label: 'Groups', route: '/(tabs)/groups' },
  { icon: Calendar, label: 'Events', route: '/(tabs)/events' },
];
import Avatar from '@/components/ui/Avatar';
import StoryBar from '@/components/feed/StoryBar';
import PostCard from '@/components/feed/PostCard';
import CommentSheet from '@/components/feed/CommentSheet';
import ShareModal from '@/components/feed/ShareModal';
import PremiumCard from '@/components/ui/PremiumCard';
import { PostSkeleton } from '@/components/ui/SkeletonLoader';
import { useApp } from '@/context/AppContext';
import { CURRENT_USER } from '@/data/dummyData';
import { addNotes, getAllPost } from '@/service/post';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import { addOrUpdatePost, appendPostList, setNewPost, setPostList, setRemoveUserPosts } from '@/redux-toolkit/slice/postSlice';
import PostDialog from '@/components/forms/PostDialog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfirmDialog from "@/components/forms/ConfirmDialog";
import { getAllUser, getSingleUserDetail } from '@/service/auth';
import { setUserCount, setUserData, setUserList } from '@/redux-toolkit/slice/userSlice';
import { disconnectSocket, getSocket } from '@/socket/socket';
import { Alert } from 'react-native';
import { markAllAsRead, markNotificationsAsReadByReceiver, setNotificationList } from "@/redux-toolkit/slice/notificationSlice";
import { getAllNotifications, UpdateNotifications } from "@/service/notification";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signOut } from "@/lib/session";

export default function HomeScreen() {
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const reduxPosts = useAppSelector((state) => state.post.postList);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [sharePost, setSharePost] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [postText, setPostText] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [postListRefresh, setPostListRefresh] = useState(false);
  // Feed paging: the server sends 20 posts and a cursor for the next page.
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [postLoading, setPostLoading] = useState<boolean>(false);
  const userDatas = useAppSelector((state) => state?.user?.userData);
  const userList = useAppSelector((state) => state?.user?.userList);
  const premiumStatus = userDatas?.user?.premiumUser;
  const isPremium = premiumStatus === "premium";
  const isPending = (premiumStatus === null && userDatas?.user?.amount && userDatas?.user?.paymentImage);
  const isNotApplied = (premiumStatus === null && !userDatas?.user?.amount && !userDatas?.user?.paymentImage);
  const filteredUsers = userList?.filter((user: any) =>
    user?.fullName?.toLowerCase()?.includes(searchText?.toLowerCase()) ||
    user?.email?.toLowerCase()?.includes(searchText?.toLowerCase())
  );
  const notifyCount = useAppSelector((state) => state?.notification?.unreadCount);

  useEffect(() => {
    if (!socket) return;
    socket.on("deleteUser", (user) => {
      dispatch(setRemoveUserPosts(user));
    });

    socket.on("postRefresh", (post) => {
      dispatch(setNewPost(post));
    });
    socket.on("postNote", (post) => {
      dispatch(setNewPost(post));
    })

    return () => {
      socket.off("deleteUser");
      socket.off("postRefresh");
      socket.off("postNote");
    }
  }, []);

 

  const handleupdateAllNotifications = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      if (!user?._id) return;
      const res = await UpdateNotifications(user?._id);
      if (res.status === 200) {
        dispatch(markNotificationsAsReadByReceiver(user?._id))
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
  }

  const handleGetAllNotifications = async () => {
    const userData = await AsyncStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;
    if (!user?._id) return;
    try {
      const res = await getAllNotifications(user?._id);
      if (res.status === 200) {
        // The envelope carries the server's unread count; the badge uses it.
        dispatch(setNotificationList({ data: res?.data?.data ?? [], unreadCount: res?.data?.unreadCount }));
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    handleGetAllNotifications();
  }, []);

  const handleAddNotes = async () => {
    const userData = await AsyncStorage.getItem("user");
    const user = userData ? JSON.parse(userData) : null;
    if (!user?._id || !postText?.trim()) return;
    try {
      const obj = { userId: user?._id, notes: postText };
      setPostLoading(true);
      const res = await addNotes(obj);
      if (res.status === 201) {
        Alert.alert("Notes Added Successfully.", res?.data?.message);
        dispatch(addOrUpdatePost(res?.data?.post));
        setPostListRefresh(true);
        setPostText("");
      }
    }
    catch (err: any) {
      console.log(err);
      Alert.alert("Add Notes Failed.", err?.response?.data?.message || err?.message)
    } finally {
      setPostLoading(false);
    }
  }

  const handleGetSingle = async () => {
    const userData = await AsyncStorage.getItem("user").then(res => res ? JSON.parse(res) : null);
    const userId = userData?._id;
    if (!userId) return;
    try {
      const res = await getSingleUserDetail(userId);
      if (res.status === 200) {
        dispatch(setUserData(res?.data));
      };
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
  };
  // Runs once on mount. Depending on `userDatas` looped forever: the fetch
  // dispatches setUserData with a fresh object every time, so the dependency
  // always changed identity and re-triggered the fetch.
  useEffect(() => {
    handleGetSingle();
  }, []);


  const fetchUsers = async () => {
    const userData = await AsyncStorage.getItem("user").then(res => res ? JSON.parse(res) : null);
    const userId = userData?._id;
    if (!userId) return;
    try {
      const res = await getAllUser(userId);
      const users = res?.data?.data ?? [];
      dispatch(setUserList(users));
      dispatch(setUserCount(users.length));
    } catch (err: any) {
      console.log(err?.response?.data?.message);
    }
  };
  useEffect(() => {
    if (userList?.length === 0) {
      fetchUsers();
    }
  }, [userList?.length])

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      // This used to remove only the access token, leaving the refresh token
      // and the member's stored profile on the device.
      await signOut();
      setOpen(false);
      router.replace('/login');
      Alert.alert("Logout Successfully.", "You have Logged out successfully.");
    } finally {
      setLogoutLoading(false);
    }
  };

  // Loads the first page of the feed, replacing whatever is on screen.
  const fetchFirstPage = useCallback(async () => {
    const userId = userDatas?.user?._id;
    if (!userId) return;
    try {
      const res = await getAllPost(userId);
      dispatch(setPostList(res?.data?.posts ?? []));
      setFeedCursor(res?.data?.nextCursor ?? null);
      setFeedHasMore(Boolean(res?.data?.hasMore));
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  }, [userDatas?.user?._id, dispatch]);

  useEffect(() => {
    if (!userDatas?.user?._id) return;
    setLoading(true);
    fetchFirstPage().finally(() => setLoading(false));
  }, [userDatas?.user?._id, userList?.length, fetchFirstPage]);

  // Infinite scroll. The feed used to load every post ever written in one
  // request; it now arrives a page at a time.
  const loadMorePosts = useCallback(async () => {
    const userId = userDatas?.user?._id;
    if (!userId || !feedCursor || loadingMore || !feedHasMore) return;

    setLoadingMore(true);
    try {
      const res = await getAllPost(userId, feedCursor);
      dispatch(appendPostList(res?.data?.posts ?? []));
      setFeedCursor(res?.data?.nextCursor ?? null);
      setFeedHasMore(Boolean(res?.data?.hasMore));
    } catch (err) {
      console.error("Error loading more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [userDatas?.user?._id, feedCursor, feedHasMore, loadingMore, dispatch]);

  // Pull to refresh used to spin for 1.2s and fetch nothing.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchFirstPage();
    } finally {
      setRefreshing(false);
    }
  }, [fetchFirstPage]);

  const handleStoryPress = useCallback((s: any) => {
    router.push({ pathname: '/profile/[id]', params: { id: s.id } } as any);
  }, []);

  const memoStoryBar = useMemo(() => (
    <StoryBar onStoryPress={handleStoryPress} />
  ), [handleStoryPress]);

  const headerComponent = useMemo(() => {
    return (
      <View>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.searchWrapper}>
            <View style={styles.searchRow}>
              <Search color={Colors.gray500} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Vibe..."
                placeholderTextColor={Colors.gray500}
                value={searchText}
                onChangeText={(text) => { setSearchText(text); setShowSearchDropdown(text.trim().length > 0) }}
              />
            </View>
            {
              showSearchDropdown && (
                <View style={styles.searchDropdown}>
                  {
                    filteredUsers?.length > 0 ? (
                      filteredUsers.map((user: any) => (
                        <TouchableOpacity
                          key={user._id}
                          style={styles.searchUserItem}
                          onPress={() => {
                            setSearchText("");
                            setShowSearchDropdown(false);
                            router.push({
                              pathname: "/profile/[id]",
                              params: { id: user._id },
                            } as any);
                          }}
                        >
                          <Avatar uri={user?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={40} />
                          <View style={{ marginLeft: 10 }}>
                            <Text style={styles.userName}>
                              {user?.fullName}
                            </Text>

                            <Text style={styles.userUsername}>
                              @{user?.email}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.notFoundContainer}>
                        <Text style={styles.notFoundText}>
                          No user found
                        </Text>
                      </View>
                    )
                  }
                </View>
              )
            }
          </View>
          <View style={styles.topIcons}>
            <TouchableOpacity style={styles.topIconBtn} onPress={() => { handleupdateAllNotifications();router.replace("/notification/[id]") }}>
              <Bell color={Colors.gray300} size={22} />
              {notifyCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notifyCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => setShowDropdown(!showDropdown)}
            >
              <Avatar uri={userDatas?.user?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={32} />
              <ChevronDown color={Colors.gray400} size={14} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Nav Icons */}
        <View style={styles.quickNav}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickNavScroll}>
            {topIcons.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickNavItem}
                onPress={() => router.push(item.route as any)}
              >
                <LinearGradient
                  colors={[Colors.gray50, Colors.white]}
                  style={styles.quickNavIcon}
                >
                  <item.icon color={Colors.primary} size={20} />
                </LinearGradient>
                <Text style={styles.quickNavLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stories */}
        {memoStoryBar}

        {/* Create Post */}
        <View style={styles.createPost}>
          <Avatar uri={userDatas?.user?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={40} />
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Colors.gray50,
              borderRadius: BorderRadius.full,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: Colors.gray200,
            }}
          >
            {/* INPUT */}
            <TextInput
              style={{
                flex: 1,
                color: Colors.gray900,
                paddingVertical: 0,
                fontSize: 14,
              }}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.gray400}
              value={postText}
              onChangeText={setPostText}
            />

            {/* SEND BUTTON */}
            <TouchableOpacity
              onPress={handleAddNotes}
              disabled={!postText?.trim() || postLoading}
              style={{
                marginLeft: 8,
                backgroundColor: Colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
                minWidth: 60,
              }}
            >
              {postLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={{ color: Colors.white, fontSize: 12, fontWeight: "600" }}>
                  Send
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.createPostActions}>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => setShowCreatePost(true)}>
            <ImageIcon color={Colors.success} size={18} />
            <Text style={styles.mediaBtnText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => setShowCreatePost(true)}>
            <Video color={Colors.error} size={18} />
            <Text style={styles.mediaBtnText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaBtn} onPress={() => setShowCreatePost(true)}>
            <Send color={Colors.primary} size={18} />
            <Text style={styles.mediaBtnText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Card */}
        {/* {isNotApplied && <PremiumCard />}  */}
      </View>
    )
  }, [searchText, showSearchDropdown, filteredUsers, isNotApplied, handleStoryPress]);

  const renderItem = ({ item, index }: any) => {
    // Transform backend post structure to PostCard expected format
    const post = {
      id: item._id,
      user: item.createdBy,
      title: item.title || '',
      notes: item.notes || '',
      description: item.description || '',
      images: item.images || [],
      likes: item.likes || [],
      type: item.type || "public",
      comments: item.comments || [],
      shares: 0,
      isLiked: false,
      isSaved: false,
      timestamp: new Date(item.createdAt).toLocaleDateString(),
    };

    return (
      <PostCard
        post={post}
        onComment={(post) => setSelectedPost(post)}
        onShare={post => setSharePost(post)}
      />
    );
  };

  const renderSkeletons = () => (
    <View>
      <PostSkeleton />
      <PostSkeleton />
    </View>
  );

  return (
    <>
      <ConfirmDialog
        visible={open}
        onClose={() => setOpen(false)}
        loading={logoutLoading}
        title="Logout"
        description="Are you sure you want to logout?"
        buttonName="Logout"
        onConfirm={handleLogout}
      />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <FlatList
          data={loading ? [] : reduxPosts}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          ListHeaderComponent={headerComponent}
          ListEmptyComponent={
            loading ? (
              renderSkeletons()
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.gray700 }}>
                  Nothing in your feed yet
                </Text>
                <Text style={{ fontSize: 14, color: Colors.gray500, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Posts from the club and from members you connect with will show up here.
                </Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />

        {/* Profile Dropdown */}
        {showDropdown && (
          <TouchableOpacity
            style={styles.dropdownOverlay}
            onPress={() => setShowDropdown(false)}
          >
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  router.push('/(tabs)/profile');
                }} >
                <User color={Colors.gray300} size={18} />
                <Text style={styles.dropdownText}>Profile</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  router.push('/review');
                }}
              >
                <BadgeCheck color={Colors.gray300} size={18} />
                <Text style={styles.dropdownText}>Reviews</Text>
              </TouchableOpacity> 
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  router.push('/unBlock');
                }}
              >
                <SquareActivity color={Colors.gray300} size={18} />
                <Text style={styles.dropdownText}>Unblock</Text>
              </TouchableOpacity>
                <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  router.push('/termsAndConditionsScreen');
                }} >
                <FileText color={Colors.gray300} size={18} />
                <Text style={styles.dropdownText}>Term & Condition</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowDropdown(false);
                  setOpen(true);
                }}
              >
                <LogOut color={Colors.error} size={18} />
                <Text style={[styles.dropdownText, { color: 'red' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        <CommentSheet
          visible={!!selectedPost}
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
        <ShareModal
          visible={!!sharePost}
          onClose={() => setSharePost(null)}
          post={sharePost}
        />

        <PostDialog
          visible={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          setPostListRefresh={setRefreshing}
        />
      </View>
    </>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  list: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchDropdown: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    maxHeight: 300,
    zIndex: 999,
    elevation: 10,
  },

  searchUserItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.gray200,
  },

  userName: {
    color: Colors.gray900,
    fontSize: 15,
    fontWeight: "600",
  },

  userUsername: {
    color: Colors.gray500,
    fontSize: 13,
  },

  notFoundContainer: {
    padding: 15,
    alignItems: "center",
  },

  notFoundText: {
    color: Colors.gray500,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  searchInput: {
    flex: 1,
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
  },
  topIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topIconBtn: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: Typography.fontWeights.bold,
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickNav: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  quickNavScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  quickNavItem: {
    alignItems: 'center',
    gap: 6,
  },
  quickNavIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  quickNavLabel: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.xs,
  },
  createPost: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.white,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  createPostInput: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  createPostPlaceholder: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.base,
  },
  createPostActions: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  mediaBtnText: {
    color: Colors.gray700,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 90,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
  },
});
