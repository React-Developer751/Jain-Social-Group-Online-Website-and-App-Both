import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Search, Plus, Lock, Users, Globe } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import { deleteGroup, getAllGroups, toggleMember } from "@/service/group";
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateGroupModal from "@/components/forms/CreateGroupDialog";
import { getSocket } from '@/socket/socket';
import { setGroupList, setGroupJoinAnUnJoin, setAddAnRemoveUserGroup, setNewGroup, setDeleteGroup, setUpdateGroupDetail, setDeleteUser, setRecoverUser } from '@/redux-toolkit/slice/businessGroupSlice';
import ConfirmDialog from '@/components/forms/ConfirmDialog';
import AddMemberCard from '@/components/forms/AddMemberDialog';
import { SkeletonList } from "@/components/ui/Skeleton";


export default function GroupsScreen() {
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState(''); 
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  // True until this screen's first request settles, so the empty message is
  // only shown once we actually know the list is empty.
  const [listLoading, setListLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [openCreateGroup, setOpenCreateGroup] = useState(false);
   const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
   const [deleteGroupData, setDeleteGroupData] = useState<any | null>(null);
   const [initialData, setInitialData] = useState<any>();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const groupList = useAppSelector((state) => state?.group?.groupList);
   const [shareCardOpen, setShareOpenCard] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const filtered = groupList?.filter(g => {
    const matchSearch = g?.title?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

   useEffect(() => {
    if(!socket)return;
    socket.on("newGroup", (group) => {
      dispatch(setNewGroup(group));
    });

    socket.on("groupInviteAccepted", (data) => {
      dispatch(setUpdateGroupDetail(data?.group));
    })
    socket.on("deleteGroup", (groupId) => {
      dispatch(setDeleteGroup(groupId));
    })

    socket.on("addAnRemoveUserFromGroup", (data) => {
      dispatch(setAddAnRemoveUserGroup(data));
    })

     socket.on("deleteUser", (user) => {
    dispatch(setDeleteUser(user));
    });
    socket.on("recoverUser", (user) => {
      dispatch(setRecoverUser(user));
    })

    return () => {
      socket.off("newGroup");
      socket.off("deleteGroup");
      socket.off("addAnRemoveUserFromGroup");
      socket.off("groupInviteAccepted");
       socket.off("deleteUser");
       socket.off("recoverUser");
    }
  }, [])

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
   const handleDeleteGroup = async () => {
    try {
      setDeleteLoading(deleteGroupData?._id);
      const res = await deleteGroup(deleteGroupData?._id);
      if (res.status === 200) {
        Alert.alert("Group Deleted Successfully.", res?.data?.message);
        setDeleteGroupOpen(false);
        setDeleteGroupData(null);
      }
    } catch (err:any) {
      Alert.alert("Group Delete Failed.", err?.response?.data?.message || err?.message);
    } finally {
      setDeleteLoading(null);
    }
  };



  const handleGetAllGroup = async () => {
    try {
      const res = await getAllGroups();
      if (res.status === 200) {
        dispatch(setGroupList(res?.data?.groups));
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    }
    finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (groupList?.length === 0) {
      handleGetAllGroup();
    }
  }, [groupList?.length]);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    getUser();
  }, [groupList?.length])

  const renderGroup = ({ item }: any) => {
    const isJoined = item?.members?.some((i: any) => i?._id === user?._id);
    const isOwner = item?.createdBy?._id === user?._id;
    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => router.push({ pathname: '/group/[id]', params: { id: item?._id } } as any)}
      >
        {isOwner && (
  <View style={styles.menuWrapper}>
    <TouchableOpacity
      onPress={(e) => {e.stopPropagation();setOpenMenuId(openMenuId === item._id ? null : item._id)}}
    >
      <Text style={{ color: Colors.white, fontSize: 20 }}>⋮</Text>
    </TouchableOpacity>

    {openMenuId === item._id && (
      <View style={styles.dropdown}>
         <TouchableOpacity
          onPress={() => { setSelectedGroupId(item._id); setShareOpenCard(true); setOpenMenuId(null);}}
        >
          <Text style={styles.dropdownText}>Add Members</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setInitialData(item); setOpenCreateGroup(true); setOpenMenuId(null);}}
        >
          <Text style={styles.dropdownText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {setDeleteGroupData(item);setDeleteGroupOpen(true);setOpenMenuId(null);
          }}
        >
          <Text style={[styles.dropdownText, { color: "red" }]}>
           {  deleteLoading === item?._id ? <ActivityIndicator color={"red"} /> : "Delete"}
          </Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
)}
        <Image source={{ uri: item?.images?.[0] }} style={styles.groupCover} />
        <View style={styles.groupOverlay} />
        {item.isPrivate && (
          <View style={styles.privateBadge}>
            <Lock color={Colors.white} size={12} />
            <Text style={styles.privateBadgeText}>Private</Text>
          </View>
        )}
        {isJoined && (
          <View style={styles.joinedBadge}>
            <Text style={styles.joinedBadgeText}>Joined</Text>
          </View>
        )}
        <View style={styles.groupInfo}>
          <Text style={styles.groupName} numberOfLines={1}>{item?.title}</Text>
          <View style={styles.groupMeta}>
            <Users color={Colors.gray400} size={14} />
            <Text style={styles.groupMetaText}>{item?.members?.length} members</Text>
            <Globe color={Colors.gray400} size={14} />
            {/* <Text style={styles.groupMetaText}>{item.category}</Text> */}
          </View>
          <Text style={styles.groupDesc} numberOfLines={2}>{item.description}</Text>
          <TouchableOpacity
            style={[styles.joinBtn, isJoined && styles.leaveBtn]}
            onPress={() => { handleToggleMember(item?._id) }}
            disabled={Boolean(loading)}
          >
            <Text style={[styles.joinBtnText, isJoined && styles.leaveBtnText]}>
              {loading === item?._id ? <ActivityIndicator color={"white"} /> : isJoined ? 'Remove Group' : 'Join Group'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  };
  return (
    <>
          <AddMemberCard visible={shareCardOpen} onOpenChange={setShareOpenCard} groupId={selectedGroupId} />
     <ConfirmDialog
        visible={deleteGroupOpen}
        onClose={() => setDeleteGroupOpen(false)}
        loading={deleteLoading === deleteGroupData?._id}
        title="Delete Group"
        description="Are you sure you want to delete this group?"
        buttonName="Delete"
        onConfirm={handleDeleteGroup}
      />
      <CreateGroupModal
        visible={openCreateGroup}
        onClose={() => setOpenCreateGroup(false)}
        initialData={initialData}
        onSubmit={(data) => {
          console.log(data);
        }}
      />
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Groups</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => { setOpenCreateGroup(true) }}>
            <Plus color={Colors.primary} size={22} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search color={Colors.gray500} size={18} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search groups..."
            placeholderTextColor={Colors.gray500}
          />
        </View>

        {/* Categories */}
        {/* <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
        style={styles.categoriesContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.catChipText, activeCategory === cat && styles.catChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView> */}

        {/* Groups */}
        <FlatList
          data={filtered}
          keyExtractor={(g: any) => g?._id}
          renderItem={renderGroup}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setOpenMenuId(null)}
          ListEmptyComponent={() =>
            listLoading ? (
              <SkeletonList variant="tile" count={4} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptyText}>
                  Groups the club creates will appear here.
                </Text>
              </View>
            )
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
emptyContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 40,
 marginTop : 220
},

emptyTitle: {
  fontSize: Typography.fontSizes.xl,
  fontWeight: Typography.fontWeights.bold,
  color: Colors.gray900,
  marginBottom: 4,
},

emptyText: {
  fontSize: Typography.fontSizes.base,
  color: Colors.gray500,
  textAlign: "center",
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  menuWrapper: {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
  alignItems: "flex-end",
},

dropdown: {
  marginTop: 5,
  backgroundColor: Colors.gray50,
  padding: 10,
  borderRadius: 10,
  width: 100,
  elevation: 5,
},

dropdownText: {
  color: Colors.gray900,
  paddingVertical: 6,
  fontSize: 14,
},
  headerTitle: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
  },
  createBtn: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
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
  categoriesContainer: { marginBottom: 4, minHeight: 35, maxHeight: 36 },
  categoriesScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    color: Colors.gray400,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  catChipTextActive: {
    color: Colors.white,
  },
  groupCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  groupCover: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  groupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  privateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  privateBadgeText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
  joinedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  joinedBadgeText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  groupInfo: { padding: 16 },
  groupName: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 6,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  groupMetaText: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.sm,
  },
  groupDesc: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.base,
    lineHeight: 20,
    marginBottom: 14,
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
    alignItems: 'center',
  },
  joinedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  joinBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  leaveBtnText: { color: Colors.error },
  joinedBtnText: {
    color: Colors.primary,
  },
 leaveBtn: {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: Colors.error,
},
});
