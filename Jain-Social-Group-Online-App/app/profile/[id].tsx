import React, { useEffect, useState } from 'react';
import { View, Text, Image,Alert, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Dimensions } from 'react-native';

const W = Dimensions.get('window').width;
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2, MoveVertical as MoreVertical, BadgeCheck, MessageCircle, UserPlus, UserCheck } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import PostCard from '@/components/feed/PostCard';
import { getSingleUserDetail } from "@/service/auth";
import { BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReportModal from "@/components/ui/ReportModal";
import ConfirmDialog from '@/components/forms/ConfirmDialog';
import { useAppDispatch } from '@/redux-toolkit/customHook/hook';
import { blockedUser } from '@/service/block';
import { setBlockUser } from '@/redux-toolkit/slice/chatSlice';
import { setRemoveUser } from '@/redux-toolkit/slice/userSlice';
import { SkeletonList } from "@/components/ui/Skeleton";

const TABS = ['Posts', 'Gallery'];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFollowing, setIsFollowing] = useState(false);
  /* True until this profile's first request settles. Without it the tabs
     announced "no posts" before the profile had even been fetched. */
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Posts');
  const [userDatas, setUserDatas] = useState<any | null>();
  const [showMenu, setShowMenu] = useState(false);
   const [openReportModal, setOpenReportModal] = useState(false);
    const [openPostReportData, setOpenPostReportModal] = useState(null);
    const [blockUserData, setBlockUserData] = useState<any>(null);
      const [blockDialogOpen, setBlockDialogOpen] = useState(false);
      const [blockLoading, setBlockLoading] = useState(false);
      const dispatch = useAppDispatch();

  const premiumUser = userDatas?.user?.premiumUser === "premium";
  const imageUrls = userDatas?.posts?.flatMap((post: any) => post.images || [])?.filter((url: string) => url.match(/\.(jpg|jpeg|png|webp|gif)$/i));
   
   const handleBlockUser = async() => {
     const userData = await AsyncStorage.getItem("user");
     const fromId = userData ? JSON.parse(userData)?._id : null;
    let obj = {fromId, toId:blockUserData?._id};
    try{
      setBlockLoading(true);
      const res = await blockedUser(obj);
      if(res.status === 200){
        Alert.alert("User Blocked.", res?.data?.message);
               dispatch(setBlockUser({chatId:res?.data?.chatId, toId:blockUserData?._id, fromId:fromId}));
        dispatch(setRemoveUser(blockUserData?._id));
        setBlockDialogOpen(false);
        setBlockUser(null);
        router.replace("/(tabs)");
      }
    }
    catch(err:any){
      console.log(err);
      Alert.alert("User Blocked Failed.", err?.response?.data?.message || err?.message || "User Blocked Process Failed.");
    }
    finally{
      setBlockLoading(false);
    }
  }

  useEffect(() => {
    const getUserData = async() => {
      const userData = await AsyncStorage.getItem("user");
      const userId = userData ? JSON.parse(userData)._id : null;

      if(userId) {
        const follow = userDatas?.following?.some((following: any) => following?._id === userId);
        setIsFollowing(!!follow);
      }
    };

    getUserData();
  }, [userDatas]);

  useEffect(() => {
    const backAction = () => {
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => subscription.remove();
  },[])
  const handleGetSingle = async () => {
    if (!id) { setProfileLoading(false); return; }
    try {
      const res = await getSingleUserDetail(id);
      if (res.status === 200) {
        setUserDatas(res?.data);
      }
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      handleGetSingle();
    }
  }, [id]);

  return (
    <>
     <ConfirmDialog
        visible={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        loading={blockLoading}
        title={`Block ${blockUserData?.fullName || ""}`}
        description={`Are you sure you want to block the user "${blockUserData?.fullName || ""}"? They will no longer be able to message or view your profile.`}
        buttonName="Block"
        onConfirm={handleBlockUser}
        />
        <ReportModal visible={openReportModal} onClose={()=>{setOpenReportModal(false)}} initialData={{ ...(openPostReportData || {}), reportType: "user" }}/>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />

      {/* Cover */}
      <View>
        <Image source={{ uri: userDatas?.user?.coverImage || "https://imgs.search.brave.com/kw_qY89Yq9zZZHGIxcrZulLXAq5h4GmQ7LtNs1KnOVk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjIx/NDM2OTQ0Ny92ZWN0/b3IvYWJzdHJhY3Qt/YmFja2dyb3VuZC1k/ZXNpZ24tcm91Z2gt/YW5kLXNvZnQtd2F2/ZS10ZXh0dXJlLXdp/dGgtYmx1cnJlZC1w/YXN0ZWwtY29sb3Jz/LmpwZz9zPTYxMng2/MTImdz0wJms9MjAm/Yz1reW85ZmxNQVN3/c1M5eWYxR3BNRjdm/cHFFWFN5a3ZzMHhI/Zm1DRmdXVFlJPQ" }} style={styles.cover} />
        <LinearGradient
          colors={['transparent', '#FFFFFF']}
          style={styles.coverOverlay}
        />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <ArrowLeft color={Colors.white} size={22} />
          </TouchableOpacity>
          <View style={styles.topActions}>
            {/* <TouchableOpacity style={styles.circleBtn}>
              <Share2 color={Colors.white} size={20} />
            </TouchableOpacity> */}
           <View>
  <TouchableOpacity
    style={styles.circleBtn}
    onPress={() => setShowMenu(!showMenu)}
  >
    <MoreVertical color="#f0f1f3" size={20} />
  </TouchableOpacity>


  {showMenu && (
    <View style={styles.dropdown}>

      <TouchableOpacity
        style={styles.menuItem}
       onPress={() => { setBlockUserData(userDatas?.user); setBlockDialogOpen(true); setShowMenu(false); }}

      >
        <Text style={styles.menuText}>
          Block User
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        style={styles.menuItem}
         onPress={() => { setOpenPostReportModal(userDatas as any); setOpenReportModal(true); setShowMenu(false); }}
      >
        <Text style={styles.menuText}>
          Report User
        </Text>
      </TouchableOpacity>

    </View>
  )}

</View>
          </View>
        </View>
      </View>

      {/* Profile Info */}

      <View style={styles.profileSection}>
        <Image
          source={{
            uri:
              userDatas?.user?.profileImage &&
                userDatas?.user.profileImage !== "null"
                ? userDatas?.user.profileImage
                : "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"
          }}
          style={{ width: 50, height: 50, borderRadius: 25 }}
        />
        <View style={styles.profileMeta}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{userDatas?.user?.fullName}</Text>
            {userDatas?.user?.isVerified && <BadgeCheck color={Colors.primary} size={18} />}
            {premiumUser && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>{userDatas?.user?.email}</Text>
          {/* <Text style={styles.bio}>{user?.bio}</Text> */}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{userDatas?.posts?.length || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{userDatas?.followers?.length || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statVal}>{userDatas?.following?.length || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Action Buttons */}
      { userDatas?.user?._id !== id && <View style={styles.btnRow}>
          <TouchableOpacity 
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={() => setIsFollowing(!isFollowing)}
          >
            {isFollowing ? (
              <UserCheck color={Colors.primary} size={16} />
            ) : (
              <UserPlus color={Colors.white} size={16} />
            )}
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'UnFollow' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <MessageCircle color={Colors.white} size={16} />
            <Text style={styles.followBtnText}>Message</Text>
          </TouchableOpacity>
        </View>}
      </View>

      {/* Tabs */}
      <View style={{ backgroundColor: Colors.dark.bg }}>
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
      </View>

      {activeTab === 'Posts' && (
        <View>
          {userDatas?.posts?.length > 0 ? (
            userDatas?.posts?.map((post: any) => {
              const transformedPost = {
                id: post._id,
                user: post.createdBy,
                notes : post?.notes,
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
          ) : profileLoading ? (
            <SkeletonList variant="card" count={2} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 32 }}>
              <Text style={{ color: Colors.gray700, fontSize: 16, fontWeight: '600' }}>
                No posts yet
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'Gallery' && (
        <>
          {imageUrls?.length > 0 ? (
            <View style={styles.gallery}>
              {imageUrls?.map((img: string, i: number) => (
                <Image
                  key={i}
                  source={{ uri: img }}
                  style={styles.galleryImg}
                />
              ))}
            </View>
          ) : profileLoading ? (
            <SkeletonList variant="tile" count={4} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 32 }}>
              <Text style={{ color: Colors.gray700, fontSize: 16, fontWeight: '600' }}>
                No photos yet
              </Text>
            </View>
          )}
        </>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  cover: { width: '100%', height: 220, resizeMode: 'cover' },
  coverOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  dropdown:{
  position:"absolute",
  right:0,
  top:45,
  width:160,
  backgroundColor:"#FFFFFF",
  borderRadius:12,
  paddingVertical:8,
  shadowColor:"#000",
  shadowOpacity:0.15,
  shadowRadius:10,
  shadowOffset:{
    width:0,
    height:4
  },
  elevation:5,
  borderWidth:1,
  borderColor:"#E5E7EB",
},


menuItem:{
  paddingVertical:12,
  paddingHorizontal:16,
},

menuText:{
  color:"#111827",
  fontSize:14,
  fontWeight:"500",
},
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: { flexDirection: 'row', gap: 10 },
  profileSection: {
    paddingHorizontal: 16,
    marginTop: -44,
    paddingBottom: 8,
  },
  profileMeta: { marginTop: 48, marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { color: "#111827", fontSize: Typography.fontSizes.xl, fontWeight: Typography.fontWeights.bold },
  premiumBadge: {
    backgroundColor: Colors.warning,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  premiumBadgeText: { color: Colors.white, fontSize: 10, fontWeight: Typography.fontWeights.bold },
  username: { color: "#6B7280", fontSize: Typography.fontSizes.base, marginBottom: 8 },
  bio: { color: Colors.gray300, fontSize: Typography.fontSizes.base, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { color: "#4a4c4e", fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.bold },
  statLabel: { color: "#444546", fontSize: Typography.fontSizes.xs, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.dark.border },
  btnRow: { flexDirection: 'row', gap: 10 },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 11,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followBtnText: { color: Colors.white, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold },
  followingBtnText: { color: Colors.primary },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,

    zIndex: 999,
    elevation: 10,
    position: 'relative',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: "white", fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.medium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.fontWeights.semibold },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  galleryImg: { width: (W - 4) / 3, height: (W - 4) / 3, resizeMode: 'cover' },
});
