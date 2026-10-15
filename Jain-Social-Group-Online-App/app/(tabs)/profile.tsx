import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, ScrollView, StatusBar, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CreditCard as Edit, Settings, Grid2x2 as Grid, Image as ImageIcon, Users, Video, BadgeCheck, MapPin, Link, MessageCircle, UserPlus } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import PostCard from '@/components/feed/PostCard';
import PremiumCard from '@/components/ui/PremiumCard';
import { CURRENT_USER, POSTS, GALLERY_IMAGES, USERS } from '@/data/dummyData';
import { deleteUserRequest, getSingleUser } from "@/service/auth";
import { getAllPost } from '@/service/post';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setUserData } from "@/redux-toolkit/slice/userSlice";
import { setUserPostList } from '@/redux-toolkit/slice/postSlice';
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/customHook/hook";
import ConfirmDialog from "@/components/forms/ConfirmDialog";
import { getSingleUserDetail } from "@/service/auth";
import UserDialog from "@/components/forms/UserDialog";
import { disconnectSocket, getSocket } from '@/socket/socket';
import { Alert } from 'react-native';
import {BackHandler} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { signOut } from "@/lib/session";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { usePresence } from "@/hooks/usePresence";


const { width } = Dimensions.get('window');
const IMG_SIZE = (width - 4) / 3;

const TABS = ['Posts', 'Gallery', 'Friends', 'Videos'];

export default function ProfileScreen() {
  // Live presence, not the stale flag baked into the fetched list.
  const isOnline = usePresence();
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('Posts');
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  /* True until this profile's first request settles. Without it the tabs
     announced "no posts" before the profile had even been fetched. */
  const [profileLoading, setProfileLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [user, setUser] = useState<any | null>();
  const userDatas = useAppSelector((state) => state?.user?.userData);
  const imageUrls = userDatas?.posts?.flatMap((post: any) => post.images || [])?.filter((url: string) => url.match(/\.(jpg|jpeg|png|webp|gif)$/i));
  const videoUrls = userDatas?.posts?.flatMap((post: any) => post.images || [])?.filter((url: string) => url.match(/\.(mp4|mov|avi|mkv|webm)$/i));
  const premiumStatus = userDatas?.user?.premiumUser;
  const isPremium = premiumStatus === "premium";
  const isPending = (premiumStatus === null && userDatas?.user?.amount && userDatas?.user?.paymentImage);
  const isNotApplied = (premiumStatus === null && !userDatas?.user?.amount && !userDatas?.user?.paymentImage);

  useEffect(() => {
    const handleBackButton = () => {
       return true;
    };
     const subscription =  BackHandler.addEventListener("hardwareBackPress", handleBackButton);
      return () => subscription.remove();
  },[]);
  const toggleMenu = () => { setMenuOpen(prev => !prev); };

   const handleDeleteRequestUser = async () => {
     if(!userDatas?.user?._id) return;
    try {
      setDeleteLoading(true);
      const res = await deleteUserRequest(userDatas?.user?._id);
      if (res.status === 200) {
        Alert.alert("User Account Delete Successfully.", res?.data?.message);
        await signOut();
        dispatch(setUserData(null));
        router.replace('/login');
         setDeleteDialogOpen(false);
      }
    } catch (err:any) {
       Alert.alert("User Account Deletion Failed.", err?.response?.data?.message || err?.message)
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGetSingle = async () => {
    const userData = await AsyncStorage.getItem("user").then(res => res ? JSON.parse(res) : null);
    const userId = userData?._id;
    if (!userId) { setProfileLoading(false); return; }
    try {
      const res = await getSingleUserDetail(userId);
      if (res.status === 200) {
        dispatch(setUserData(res?.data));
      };
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    } finally {
      setProfileLoading(false);
    }
  };
  useEffect(() => {
    handleGetSingle();
  }, [user?._id]);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    if (user === null) {
      getUser();
    }
  }, [user])

  const handleLogout = async () => {
    try {
      setLoading(true);
      // Signing out no longer depends on the socket being connected, and it
      // now ends the session on the server too.
      await signOut();
      dispatch(setUserData(null));
      setOpen(false);
      router.replace('/login');
      Alert.alert("Logout Successfully.", "You have Logged out successfully.");
    } finally {
      setLoading(false);
    }
  };

  const renderPosts = () => (
    <View>
      {userDatas?.posts?.length > 0 ? (
        userDatas.posts.map((post: any) => {
          const transformedPost = {
            id: post._id,
            notes : post?.notes,
            user: post.createdBy,
            title: post.title || '',
            description: post.description || '',
            images: post.images || [],
            type:post.type || "public",
            likes: post.likes || [],
            comments: post.comments || [],
            shares: 0,
            isLiked: false,
            isSaved: false,
            timestamp: new Date(post.createdAt).toLocaleDateString(),
          };

          return <PostCard key={post._id} post={transformedPost} />;
        })
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40
        }}>
          <Text style={{ color: Colors.gray700, fontSize: 16, fontWeight: '600' }}>
            {profileLoading ? "Loading your posts…" : "You have not posted yet"}
          </Text>
          {!profileLoading && (
            <Text style={{ color: Colors.gray500, fontSize: 14, marginTop: 6, textAlign: 'center' }}>
              Share something from the home tab and it will appear here.
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderGallery = () => (
    <View style={styles.gallery}>
      {imageUrls?.length > 0 ? (
        imageUrls.map((img: string, i: number) => (
          <TouchableOpacity key={i}>
            <Image source={{ uri: img }} style={styles.galleryImg} />
          </TouchableOpacity>
        ))
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
          width: '100%'
        }}>
          <Text style={{ color: Colors.gray500, fontSize: 16 }}>
            No images available
          </Text>
        </View>
      )}
    </View>
  );

  const renderFriends = () => (
    <View style={styles.friendsList}>
      {userDatas?.friends?.length > 0 ? (
        userDatas.friends.map((u: any) => (
          <View key={u?._id} style={styles.friendCard}>
            <Avatar uri={u?.profileImage || "https://res.cloudinary.com/dz7jbphok/image/upload/v1779691794/profile/aw32czm29zmqgxgkomfy.webp"} size={56} isOnline={isOnline(u?._id)} />

            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{u?.fullName}</Text>
              <Text style={styles.friendHandle}>
                {u?.email || u?.mobile}
              </Text>
            </View>

            <TouchableOpacity style={styles.friendMsgBtn} onPress={() =>{router.push({
              pathname:"/(tabs)/chat",
             params : {
              id : u?._id
             }
            })}}>
              <MessageCircle color={Colors.primary} size={18} />
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40
        }}>
          <Text style={{ color: Colors.gray500, fontSize: 16 }}>
            No friends available
          </Text>
        </View>
      )}
    </View>
  );

  const renderVideos = () => (
    <View style={styles.gallery}>
      {videoUrls?.length > 0 ? (
        videoUrls.slice(0, 6).map((img: string, i: number) => (
          <TouchableOpacity key={i} style={styles.videoThumb}>
            <Image source={{ uri: img }} style={styles.galleryImg} />
            <View style={styles.videoPlayOverlay}>
              <View style={styles.playBtn}>
                <Video color={Colors.white} size={20} />
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
          width: '100%'
        }}>
          <Text style={{ color: Colors.gray500, fontSize: 16 }}>
            No videos available
          </Text>
        </View>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Posts': return renderPosts();
      case 'Gallery': return renderGallery();
      case 'Friends': return renderFriends();
      case 'Videos': return renderVideos();
      default: return null;
    }
  };

  const stat = (label: string, value: number) => {
    // A blank number while the profile loads looks like a broken counter, and
    // a zero looks like a real answer. Show a placeholder instead.
    const formatted =
      value === undefined || value === null
        ? "–"
        : value >= 1000
          ? (value / 1000).toFixed(1) + 'k'
          : value.toString();

    return (
      <TouchableOpacity style={styles.stat}>
        {profileLoading ? (
          <SkeletonBlock style={{ height: 18, width: 28, marginBottom: 4 }} />
        ) : (
          <Text style={styles.statValue}>{formatted}</Text>
        )}
        <Text style={styles.statLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <ConfirmDialog
        visible={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        loading={deleteLoading}
        title="Delete Your Account"
        description="Are you sure you want to delete your account? This action is permanent and cannot be undone."
        buttonName="Delete"
        onConfirm={handleDeleteRequestUser}
      />
      <ConfirmDialog
        visible={open}
        onClose={() => setOpen(false)}
        loading={loading}
        title="Logout"
        description="Are you sure you want to logout?"
        buttonName="Logout"
        onConfirm={handleLogout}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" />

        {/* Cover + Profile */}
        <View>
          <Image source={{ uri: userDatas?.user?.coverImage || "https://imgs.search.brave.com/kw_qY89Yq9zZZHGIxcrZulLXAq5h4GmQ7LtNs1KnOVk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjIx/NDM2OTQ0Ny92ZWN0/b3IvYWJzdHJhY3Qt/YmFja2dyb3VuZC1k/ZXNpZ24tcm91Z2gt/YW5kLXNvZnQtd2F2/ZS10ZXh0dXJlLXdp/dGgtYmx1cnJlZC1w/YXN0ZWwtY29sb3Jz/LmpwZz9zPTYxMng2/MTImdz0wJms9MjAm/Yz1reW85ZmxNQVN3/c1M5eWYxR3BNRjdm/cHFFWFN5a3ZzMHhI/Zm1DRmdXVFlJPQ" }} style={styles.cover} />
          <LinearGradient
            colors={['transparent', Colors.white]}
            style={styles.coverOverlay}
          />
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={toggleMenu}>
              <Settings color={Colors.white} size={22} />
            </TouchableOpacity>

            {menuOpen && (
              <>
                {/* backdrop */}
                <TouchableOpacity
                  style={styles.backdrop}
                  onPress={() => setMenuOpen(false)}
                />

                {/* dropdown */}
                <View style={styles.dropdown}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setMenuOpen(false); setOpen(true); }} >
                    <Text style={styles.logoutText}>Logout</Text>
                  </TouchableOpacity>
                   <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setMenuOpen(false); setDeleteDialogOpen(true); }} >
                    <Text style={styles.logoutText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
          <View style={styles.profileSection}>
            <View style={{ position: "relative", alignSelf: "flex-start" }}>
              <Avatar uri={userDatas?.user?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={88} isOnline={isOnline(userDatas?.user?._id)} />
           
              {isPremium && (
                <View style={styles.crownBadge}>
                  <Text style={{ color: Colors.white, fontSize: 12 }}>👑</Text>
                </View>
              )}
            </View>
            <View style={styles.profileMeta}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{userDatas?.user?.fullName}</Text>
                {userDatas?.user?.isVerified && <BadgeCheck color={Colors.primary} size={18} />}
              </View>
              <Text style={styles.profileHandle}>{userDatas?.user?.email}</Text>
              <Text style={styles.profileBio}>{userDatas?.user?.occupation}</Text>
              <View style={styles.profileLinks}>
                <View style={styles.linkRow}>
                  <MapPin color={Colors.gray500} size={14} />
                  <Text style={styles.linkText}>{userDatas?.user?.address}, {userDatas?.user?.city}, {userDatas?.user?.state}</Text>
                </View>
                <View style={styles.linkRow}>
                  <Link color={Colors.gray500} size={14} />
                  <Text style={[styles.linkText, { color: Colors.primary }]}>{userDatas?.user?.mobile}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            {stat('Posts', userDatas?.posts?.length)}
            <View style={styles.statDivider} />
            {stat('Followers', userDatas?.followers?.length)}
            <View style={styles.statDivider} />
            {stat('Following', userDatas?.following?.length)}
            <View style={styles.statDivider} />
            {stat('Friends', userDatas?.friendCount)}
          </View>

          {/* Buttons */}
          <View style={styles.profileBtns}>
            <TouchableOpacity style={styles.editProfileBtn} onPress={() => { router.replace("/user/edit") }}>
              <Edit color={Colors.white} size={16} />
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.friendBtn}>
              <UserPlus color={Colors.primary} size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.friendBtn}>
              <MessageCircle color={Colors.primary} size={16} />
            </TouchableOpacity> */}
          </View>

          {/* Premium */}
          {isPremium && (
            <View style={styles.crownWrapper}>
              <Text style={styles.premiumText}>👑 Premium User</Text>
            </View>
          )}

          {isPending && (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingText}>
                Your premium request is under review. Admin will respond shortly.
              </Text>
            </View>
          )}

          {/* {isNotApplied && <PremiumCard />} */}
        </View>

        {/* Sticky Tabs */}
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
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        <View style={{ height: 100 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  cover: { width: '100%', height: 220, resizeMode: 'cover' },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  crownWrapper: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    alignItems: "center",
  },

  premiumText: {
    color: Colors.warning,
    fontWeight: "700",
  },

  pendingBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
  },

  pendingText: {
    color: Colors.gray700,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  crownBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    height: 26,
    width: 26,
    borderRadius: 13,
    backgroundColor: Colors.warning,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },

  topActionsSetting: {
    position: 'relative',
  },

  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },

  dropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 120,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.gray200,
    zIndex: 20,
    elevation: 5,
  },

  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  logoutText: {
    color: Colors.error,
    fontWeight: '600',
  },

  topActions: {
    position: 'absolute',
    top: 48,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 0,
    marginTop: -44,
    gap: 16,
  },
  profileMeta: { flex: 1, paddingTop: 48 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  profileName: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
  },
  profileHandle: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.base,
    marginBottom: 8,
  },
  profileBio: {
    color: Colors.gray700,
    fontSize: Typography.fontSizes.base,
    lineHeight: 20,
    marginBottom: 8,
  },
  profileLinks: { gap: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.gray200,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  statLabel: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.gray200 },
  profileBtns: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editProfileBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  friendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    paddingHorizontal: 0,
  },
  galleryImg: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    resizeMode: 'cover',
  },
  videoThumb: { position: 'relative' },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsList: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  friendInfo: { flex: 1 },
  friendName: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  friendHandle: { color: Colors.gray500, fontSize: Typography.fontSizes.sm, marginTop: 2 },
  friendMsgBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },


});
