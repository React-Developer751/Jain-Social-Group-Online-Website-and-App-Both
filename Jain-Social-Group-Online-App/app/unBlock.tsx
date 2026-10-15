import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, FlatList, Image, ActivityIndicator,
} from "react-native";
import {
  Search,
  UserX,
  Unlock,
  AlertCircle,
  ArrowLeft,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { getBlockedUsers, unblockedUser } from "@/service/block";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfirmDialog from "@/components/forms/ConfirmDialog";
import {setBlockList, setUnBlock} from "@/redux-toolkit/slice/blockSlice";
import { setRecoverUser } from "@/redux-toolkit/slice/userSlice";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/customHook/hook";
import {setUnblockUserToChat} from "@/redux-toolkit/slice/chatSlice";
import { SkeletonList } from "@/components/ui/Skeleton";


export default function BlockedUsers() {
  const navigation = useNavigation();
  const dispatch  = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  // True until this screen's first request settles, so the empty message is
  // only shown once we actually know the list is empty.
  const [listLoading, setListLoading] = useState(true);
  const [unblockLoading, setUnblockLoading] = useState<string | null>(null);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<any>(null);
    const blockedList = useAppSelector((state) => state?.blocks?.blockList);

  const handleGetBlockedUsers = async () => {
    const userData = await AsyncStorage.getItem("user");
       const userId = userData ? JSON.parse(userData)?._id : null;
    if (!userId) { setListLoading(false); return; }
    try {
      const res = await getBlockedUsers(userId);

      if (res.status === 200) {
        dispatch(setBlockList(res?.data?.data || []))
      }
    } catch (err) {
      console.log(err);
    } finally {
      setListLoading(false);
    }
  };

  const handleUnBlockUser = async (toId: string) => {
     const userData = await AsyncStorage.getItem("user");
      const userId = userData ? JSON.parse(userData)?._id : null;
    try {
      setUnblockLoading(toId);

      const obj = {
        toId,
        fromId: userId,
      };

      const res = await unblockedUser(obj);

      if (res.status === 200) {
        dispatch(setUnBlock(obj));
        dispatch(setRecoverUser(activeChat?.blockedId));
        dispatch(setUnblockUserToChat({chatId: res?.data?.chatId, toId:toId, fromId : userId, }))
        setUnblockDialogOpen(false);
        setActiveChat(null);
         Alert.alert("User Unblocked Successfully", res?.data?.message || "User Unblocked Successfully")
      }
    } catch (err: any) {
                 Alert.alert("Failed to Unblock User.", err?.response?.data?.message || err?.message,)
    } finally {
      setUnblockLoading(null);
    }
  };

  useEffect(() => {
    handleGetBlockedUsers();
  }, []);

  const filteredUsers = blockedList.filter((item: any) => {
    const name = item?.blockedId?.fullName?.toLowerCase() || "";
    const email = item?.blockedId?.email?.toLowerCase() || "";

    return (
      name.includes(searchQuery.toLowerCase()) ||
      email.includes(searchQuery.toLowerCase())
    );
  });

  const renderItem = ({ item }: any) => (
    <View style={styles.userCard}>
      <View style={styles.leftSection}>
        {item?.blockedId?.profileImage ? (
          <Image
            source={{ uri: item.blockedId.profileImage }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {item?.blockedId?.fullName?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
        )}

        <View>
          <Text style={styles.name}>
            {item?.blockedId?.fullName}
          </Text>

          <Text style={styles.id}>
            Email: {item?.blockedId?.email}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        disabled={unblockLoading === item?.blockedId?._id}
        style={styles.unblockBtn}
        onPress={() => {
          setActiveChat(item);
          setUnblockDialogOpen(true);
        }}
      >
        {unblockLoading === item?.blockedId?._id ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <>
            <Unlock
              size={14}
              color="#000"
              strokeWidth={2.5}
            />
            <Text style={styles.unblockText}>Unblock</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
     <ConfirmDialog
        visible={unblockDialogOpen}
        onClose={() => setUnblockDialogOpen(false)}
        loading={Boolean(unblockLoading)}
         title={`Unblock ${
          activeChat?.blockedId?.fullName || ""
        }`}
        description={`Are you sure you want to unblock "${activeChat?.blockedId?.fullName}"?`}
        buttonName="Unblock"
        onConfirm={() =>
          handleUnBlockUser(activeChat?.blockedId?._id)
        }
      />

      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}

       <View style={styles.header}>
  <View style={styles.headerLeft}>
    <TouchableOpacity
      style={styles.backButton}
      activeOpacity={0.7}
      onPress={() => navigation.goBack()}
    >
      <ArrowLeft
        size={22}
        color="#fff"
        strokeWidth={2.5}
      />
    </TouchableOpacity>

    <UserX
      size={24}
      color="#fff"
      strokeWidth={2}
      style={styles.headerIcon}
    />

    <Text
      numberOfLines={1}
      style={styles.headerTitle}
    >
      Blocked Accounts
    </Text>
  </View>
</View>

        {/* Search */}

        <View style={styles.searchContainer}>
          <Search
            size={18}
            color="#888"
            style={styles.searchIcon}
          />

          <TextInput
            placeholder="Search current blocked list..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.input}
          />
        </View>

        {/* List */}

        {filteredUsers.length ? (
          <FlatList
    data={filteredUsers}
    renderItem={renderItem}
    keyExtractor={(item:any) => item.blockedId._id}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{
        paddingBottom: 20,
        flexGrow: filteredUsers.length ? 0 : 1,
    }}
/>
        ) : listLoading ? (
          <SkeletonList variant="row" count={4} />
        ) : (
          <View style={styles.empty}>
            <AlertCircle size={40} color="#999" />

            <Text style={styles.emptyText}>
              You have not blocked anyone
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Total Restrictions : {filteredUsers.length}
          </Text>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#fff",
},

header: {
  backgroundColor: "#000",
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: "#222",
},

headerLeft: {
  flexDirection: "row",
  alignItems: "center",
},

backButton: {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
  marginRight: 8,
},

headerIcon: {
  marginRight: 10,
},

headerTitle: {
  color: "#fff",
  fontSize: 20,
  fontWeight: "700",
  flexShrink: 1,
},

  searchContainer: {
    marginHorizontal: 16,
  marginTop: 16,
  marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
  },

  searchIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 15,
  },

 userCard: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#ECECEC",
},

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
  width: 46,
  height: 46,
  borderRadius: 23,
  borderWidth: 1,
  borderColor: "#000",
  marginRight: 14,
},

 placeholder: {
  width: 46,
  height: 46,
  borderRadius: 23,
  borderWidth: 1,
  borderColor: "#3b2525",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 14,
  backgroundColor: "#F5F5F5",
},

  placeholderText: {
    fontWeight: "700",
    fontSize: 16,
  },

  name: {
    fontWeight: "700",
    fontSize: 15,
  },

  id: {
    marginTop: 3,
    color: "#666",
    fontSize: 11,
  },

 unblockBtn: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#000",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
},

  unblockText: {
    fontWeight: "600",
    fontSize: 12,
    textTransform: "uppercase",
  },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    color: "#999",
  },

footer: {
  borderTopWidth: 1,
  borderColor: "#E5E5E5",
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: "#FAFAFA",
},

  footerText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
    textTransform: "uppercase",
  },
});