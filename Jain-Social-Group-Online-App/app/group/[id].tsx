import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, FlatList, StatusBar, Dimensions, ActivityIndicator} from 'react-native';
const { width: SCREEN_W } = Dimensions.get('window');
const MEDIA_IMG_SIZE = (SCREEN_W - 4) / 3;
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Lock, Globe, Bell, Share2, MoveVertical as MoreVertical, BadgeCheck, Image as ImageIcon } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import PostCard from '@/components/feed/PostCard';
import { GROUPS, POSTS, GALLERY_IMAGES } from '@/data/dummyData';
import {getGroupById, toggleMember} from "@/service/group";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '@/socket/socket';
import { useAppDispatch } from '@/redux-toolkit/customHook/hook';
import { setGroupList, setGroupJoinAnUnJoin, setUpdateGroupDetail } from '@/redux-toolkit/slice/businessGroupSlice';
import { Alert } from 'react-native';
import AddMemberCard from '@/components/forms/AddMemberDialog';
import {BackHandler} from "react-native";
import { usePresence } from "@/hooks/usePresence";

const TABS = ['Members'];

export default function GroupDetailScreen() {
  // Live presence, not the stale flag baked into the fetched list.
  const isOnline = usePresence();
  const dispatch = useAppDispatch();
  const socket = getSocket();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = GROUPS.find(g => g.id === id) || GROUPS[0];
  const [activeTab, setActiveTab] = useState('Members');
  const [groups, setGroup] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
   const [shareCardOpen, setShareOpenCard] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

    useEffect(() => {
       const backAction = () => {
        return true;
       };

       const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
       return () => subscription.remove();
    },[]);
    const handleToggleMember = async (groupId: string) => {
      const userId = user?._id;
      const fullName = user?.fullName;
      const email = user?.email;
      const profileImage = user?.profilImage;
      try {
        let obj = { groupId, userId, fullName, email, profileImage };
        setLoading(groupId);
        const res = await toggleMember(obj);
        if (res.status === 200) {
          Alert.alert("Member Join/UnJoin Successfully.", res?.data?.message);
          dispatch(setGroupJoinAnUnJoin(obj));
        }
      } catch (err: any) {
        console.log(err?.response?.data?.message || err?.message);
      }
      finally {
        setLoading(null);
      }
    };

    useEffect(() => {
      if(!socket)return;
        socket.on("addMembersToGroup", (data) => {
            dispatch(setUpdateGroupDetail(data));
        });

        return () => {
            socket.off("addMembersToGroup");
        };
    }, [dispatch]);

  const handleGetGroupDetail = async() => {
    if(!id) return;
     try{
       const res = await getGroupById(id);
       if(res.status === 200){
         setGroup(res?.data?.group);
       }
     }
     catch(err:any){
      console.log(err?.response?.data?.message || err?.message);
     }
  };

  useEffect(() => {
    if(!groups || Object.keys(groups)?.length === 0){
    handleGetGroupDetail();
    }
  },[groups]);

  useEffect(() => {
    const getUser = async() => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    getUser();
  },[]);

  const isJoined = groups?.members?.some((g:any) => g?._id === user?._id);
  return (
    <>
    <AddMemberCard visible={shareCardOpen} onOpenChange={setShareOpenCard} groupId={selectedGroupId} />
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
      <StatusBar barStyle="light-content" />
      {/* Cover */}
      <View>
        <Image source={{ uri: groups?.images?.[0] }} style={styles.cover} />
        <LinearGradient
          colors={['transparent', Colors.white]}
          style={styles.coverOverlay}
        />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color={Colors.white} size={24} />
          </TouchableOpacity>
          {/* <View style={styles.topActions}>
            <TouchableOpacity style={styles.topActionBtn}>
              <Bell color={Colors.white} size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topActionBtn}>
              <Share2 color={Colors.white} size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topActionBtn}>
              <MoreVertical color={Colors.white} size={22} />
            </TouchableOpacity>
          </View> */}
        </View>
      </View>

      {/* Group Info */}
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{groups?.title}</Text>
        <View style={styles.metaRow}>
          {groups?.isPrivate ? (
            <Lock color={Colors.gray400} size={14} />
          ) : (
            <Globe color={Colors.gray400} size={14} />
          )}

          <Text style={styles.metaText}>{groups?.isPrivate ? 'Private' : 'Public'} · {group.category}</Text>
        </View>
        <Text style={styles.groupDesc}>{groups?.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Users color={Colors.primary} size={16} />
            {/* Counted only once the group has loaded, so the line never
                reads just "members" with nothing in front of it. */}
            <Text style={styles.statText}>
              {groups?.members ? `${groups.members.length} ${groups.members.length === 1 ? 'member' : 'members'}` : 'Loading members'}
            </Text>
          </View>
        </View>

        {/* Admin */}
        {/* <View style={styles.adminRow}>
          <Text style={styles.adminLabel}>Admin</Text>
          <View style={styles.adminInfo}>
            <Avatar uri={group.admin.avatar} size={28} />
            <Text style={styles.adminName}>{group.admin.name}</Text>
            {group.admin.isVerified && <BadgeCheck color={Colors.primary} size={14} />}
          </View>
        </View> */}

        {/* Members preview */}
        <View style={styles.membersPreview}>
          <View style={styles.memberAvatars}>
            {groups?.members?.map((m:any, i:number) => (
              <View key={m?._id} style={[styles.memberAvatarWrap, { marginLeft: i > 0 ? -12 : 0 }]}>
                <Avatar uri={m?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2s"} size={32} />
              </View>
            ))}
          </View>
          {/* `[0].fullName` was read without a guard, so a group nobody has
              joined yet crashed this screen instead of showing it. */}
          <Text style={styles.membersPreviewText}>
            {!groups?.members
              ? ''
              : groups.members.length === 0
                ? 'No members yet'
                : groups.members.length === 1
                  ? `${groups.members[0]?.fullName?.split(' ')[0] ?? 'Someone'} joined`
                  : `${groups.members[0]?.fullName?.split(' ')[0] ?? 'Someone'} and ${groups.members.length - 1} ${groups.members.length - 1 === 1 ? 'other' : 'others'} joined`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.joinBtn, isJoined && styles.leaveBtn]}
          onPress={() => { handleToggleMember(groups?._id) }}
        >
          <Text style={[styles.joinBtnText, isJoined && styles.leaveBtnText]}>
                        {loading === groups?._id ? <ActivityIndicator color={"white"} /> : isJoined ? 'Remove Group' : 'Join Group'}
          
          </Text>
        </TouchableOpacity>
      </View>

    

      {/* Tab Content */}
  
       <View style={styles.memberHeader}>
  <Text style={styles.sectionTitle}>Member List</Text>

  {groups?.createdBy?._id === user?._id &&<TouchableOpacity
    style={styles.addMemberBtn}
    onPress={() => {setSelectedGroupId(groups?._id); setShareOpenCard(true)}}
  >
    <Text style={styles.addMemberBtnText}>+ Add Member</Text>
  </TouchableOpacity>}
</View>

{groups?.members?.map((m: any) => (
  <View key={m?._id} style={styles.memberRow}>
    <Avatar
      uri={
        m?.profileImage ||
        "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"
      }
      size={48}
      isOnline={isOnline(m?._id)}
    />
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.memberName}> {groups?.createdBy?._id !== m?._id && m.fullName}{" "}
                                            {groups?.createdBy?._id === m?._id && (
                                                (groups?.managedByAdmin && groups?.createdBy?.isDeleted)
                                                    ? "(Former Owner • Managed by Admin)"
                                                    : "(Owner)"
                                            )}</Text>
      <Text style={styles.memberHandle}>{m?.fullName}</Text>
    </View>

    {m?.id === group?.admin?.id && (
      <View style={styles.adminBadge}>
        <Text style={styles.adminBadgeText}>Admin</Text>
      </View>
    )}
  </View>
))}
      <View style={{ height: 100 }} />
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  cover: { width: '100%', height: 240, resizeMode: 'cover' },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  sectionTitle: {
  color: Colors.gray900,
  fontSize: Typography.fontSizes.lg,
  fontWeight: Typography.fontWeights.bold,
  marginBottom: 12,
  textAlign: 'left',
},
  topBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: { flexDirection: 'row', gap: 8 },
  topActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: { padding: 16 },
  groupName: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaText: { color: Colors.gray400, fontSize: Typography.fontSizes.base },
  groupDesc: {
    color: Colors.gray700,
    fontSize: Typography.fontSizes.base,
    lineHeight: 22,
    marginBottom: 14,
  },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: Colors.gray700, fontSize: Typography.fontSizes.base },
  adminRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  adminLabel: { color: Colors.gray500, fontSize: Typography.fontSizes.sm },
  adminInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminName: { color: Colors.gray900, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.medium },
  membersPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  memberAvatars: { flexDirection: 'row' },
  memberAvatarWrap: { borderWidth: 2, borderColor: Colors.white, borderRadius: 18 },
  membersPreviewText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, flex: 1 },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 13,
    alignItems: 'center',
  },
  leaveBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  joinBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  leaveBtnText: { color: Colors.error },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { color: Colors.gray500, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.medium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.fontWeights.semibold },
  membersList: { padding: 16, gap: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  memberName: { color: Colors.gray900, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.medium },
  memberHandle: { color: Colors.gray500, fontSize: Typography.fontSizes.sm, marginTop: 2 },
  adminBadge: {
    backgroundColor: Colors.primary + '25',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adminBadgeText: { color: Colors.primary, fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.medium },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  mediaImg: { width: MEDIA_IMG_SIZE, height: MEDIA_IMG_SIZE, resizeMode: 'cover' },
  memberHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},

addMemberBtn: {
  backgroundColor: Colors.primary,
  paddingHorizontal: 20,
  marginHorizontal:15,
  paddingVertical: 6,
  borderRadius: 8,
},

addMemberBtnText: {
  color: Colors.white,
  fontSize: 13,
  fontWeight: '600',
},
});
