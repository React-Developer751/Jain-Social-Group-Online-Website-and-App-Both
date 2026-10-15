import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Modal } from 'react-native';
import { X, Send, Search } from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import { USERS } from '@/data/dummyData';
import { getAllUser } from '@/service/auth';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import { setUserList } from '@/redux-toolkit/slice/userSlice';
import { sharePost } from '@/service/post';
import { Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserChatList } from '@/redux-toolkit/slice/chatSlice';
import { getChatUsers } from '@/service/chat';
import { ActivityIndicator } from 'react-native';
import { usePresence } from "@/hooks/usePresence";

interface Props {
  visible: boolean;
  onClose: () => void;
  post: any;
}

export default function ShareModal({ visible, onClose, post }: Props) {
  // Live presence, not the flag baked into the fetched list.
  const isOnline = usePresence();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"single" | "group">('group');
  const friendList = useAppSelector((state) => state?.chat?.userChatList);

  const filtered = useMemo(() => {
    return friendList
      ?.filter(item => item.isGroup === (activeTab === "group"))
      ?.filter(item => {
        if (!search) return true;

        const name = item.isGroup
          ? item?.group?.title
          : item?.friend?.fullName;

        return name?.toLowerCase().includes(search.toLowerCase());
      });
  }, [friendList, activeTab, search]);


  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSharePost = async () => {
    if (!user?._id || !post?.id || !selected.length) return;
    try {
      const obj = { fromId: user?._id, toId: selected, postId: post?.id, activeTab: activeTab };

      setLoading(true);
      const res = await sharePost(obj);
      if (res.status === 200) {
        Alert.alert("Post Shared", res?.data?.message || "The post has been shared successfully.");
        onClose();
      }
    } catch (err: any) {
      Alert.alert("Share Failed", err?.response?.data?.message || err?.message || "An error occurred while sharing the post.");
    }
    finally {
      setLoading(false);
    }
  };

  const handleGetFriendList = async () => {
    if (!user?._id) return;
    try {
      const res = await getChatUsers(user?._id);
      if (res.status === 200) {
        dispatch(setUserChatList(res?.data?.friends));
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (visible && (!friendList?.length || user?._id)) {
      handleGetFriendList();
    }
  }, [visible, user?._id]);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      setUser(userData ? JSON.parse(userData) : null);
    };
    if (user === null) {
      getUser();
    }
  }, [user]);


  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Share Post</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={Colors.gray400} size={22} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Search color={Colors.gray500} size={18} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search friends..."
              placeholderTextColor={Colors.gray500}
            />
          </View>
          <View style={styles.tabsContainer}>
            <TouchableOpacity style={[styles.tabButton, activeTab === "single" && styles.activeTab]} onPress={() => setActiveTab("single")} >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "single" && styles.activeTabText,
                ]}
              >
                Single
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "group" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("group")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "group" && styles.activeTabText,
                ]}
              >
                Group
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(u: any) => u?.chatId?.toString()}
            renderItem={({ item }) => {
              const isSel = selected.includes(item?.chatId?.toString() || '');
              return (
                <TouchableOpacity style={styles.userRow} onPress={() => toggle(item?.chatId?.toString())}>
                  <Avatar uri={(item?.friend?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2") || item?.group?.images?.[0] } size={44} isOnline={isOnline(item?.friend?._id)} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.userName}>{item?.friend?.fullName || item?.group?.title}</Text>
                    <Text style={styles.userHandle}>{item?.friend?.fullName || item?.group?.title}</Text>
                  </View>
                  <View style={[styles.checkCircle, isSel && styles.checkCircleActive]}>
                    {isSel && <Send color={Colors.white} size={12} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!selected.length || loading) && { opacity: 0.5 }
              ]}
              disabled={!selected.length || loading}
              onPress={handleSharePost}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.sendBtnText}>
                  Send to {selected.length || ""}
                  {selected.length
                    ? " friend" + (selected.length > 1 ? "s" : "")
                    : " friends"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.dark.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },

  activeTab: {
    backgroundColor: Colors.primary,
  },

  tabText: {
    color: Colors.gray500,
    fontWeight: "600",
  },

  activeTabText: {
    color: Colors.white,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    backgroundColor: Colors.dark.surfaceSecondary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  userName: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.medium,
  },
  userHandle: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  footer: {
    padding: 16,
    paddingTop: 12,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: 14,
    alignItems: 'center',
  },
  sendBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
});


