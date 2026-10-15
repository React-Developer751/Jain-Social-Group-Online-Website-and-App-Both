import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Modal, TextInput, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator,} from "react-native";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/customHook/hook";
import { addMemberToGroup } from "@/service/group";
import { setUpdateGroup } from "@/redux-toolkit/slice/businessGroupSlice";
import { getAllUsersPaged } from "@/service/auth";
import { setUserList } from "@/redux-toolkit/slice/userSlice";
import {Alert} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AddMemberCardProps {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
}

const AddMemberCard = ({ visible, onOpenChange, groupId }: AddMemberCardProps) => {
  const dispatch = useAppDispatch();

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const memberList = useAppSelector((state) => state?.user?.userList);
  const groupList = useAppSelector((state) => state?.group?.groupList);

  const currentGroup = groupList?.find((g) => g._id === groupId);
  const existingMemberIds = currentGroup?.members?.map((m) => m._id) || [];

  useEffect(() => {
    if (!visible) setSelectedUsers([]);
  }, [visible]);

  const toggleSelectUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredList = useMemo(() => {
    return memberList?.filter((user) => {
      if (existingMemberIds.includes(user._id)) return false;
      if (search) {
        return user?.fullName
          ?.toLowerCase()
          ?.includes(search.toLowerCase());
      }
      return true;
    });
  }, [memberList, search, groupList, groupId]);

  const handleAddMembers = async () => {
    try {
      const payload = { groupId, members: selectedUsers };
      setLoading(true);
      const res = await addMemberToGroup(payload);

      if (res.status === 200) {
      Alert.alert("Members Added Successfully.", res?.data?.message);
        onOpenChange(false);
        setSelectedUsers([]);
        // dispatch(setUpdateGroup(res.data?.group));
      }
    } catch (err: any) {
      Alert.alert("Failed to Add Members.", err?.response?.data?.message || err?.message || "An error occurred");
    }finally {
      setLoading(false);
    }
  };

  const handleGetUsers = async () => {
        const userData = await AsyncStorage.getItem("user").then(res => res ? JSON.parse(res) : null);
    const userId = userData?._id;
    if (!userId) return;
    try {
      // Members are searched locally, so the picker needs the full list
      // rather than the first page the server returns.
      const members = await getAllUsersPaged(userId);
      dispatch(setUserList(members));
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    handleGetUsers();
  }, [search]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* CLOSE */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => onOpenChange(false)}
          >
            <Text style={{ fontSize: 18 }}>✕</Text>
          </TouchableOpacity>

          {/* HEADER */}
          <Text style={styles.title}>Add Members</Text>

          {/* SEARCH */}
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search members..."
            placeholderTextColor="#888"
            style={styles.search}
          />

          {/* LIST */}
          <FlatList
            data={filteredList}
            keyExtractor={(item) => item._id}
            style={{ flex: 1 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No users found</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.userInfo}>
                  <Image
                    source={{ uri: item?.profileImage }}
                    style={styles.avatar}
                  />
                  <Text>{item?.fullName}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => toggleSelectUser(item._id)}
                  style={[
                    styles.checkbox,
                    selectedUsers.includes(item._id) && styles.checked,
                  ]}
                />
              </View>
            )}
          />

          {/* FOOTER */}
          <TouchableOpacity
            onPress={handleAddMembers}
            disabled={!selectedUsers.length || loading}
            style={[
              styles.button,
              (!selectedUsers.length || loading) && styles.disabledBtn,
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
            {loading ? <ActivityIndicator color="#fff" /> : "Add Members"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default AddMemberCard;






const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: "90%",
    height: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },

  closeBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },

  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#999",
    borderRadius: 4,
  },

  checked: {
    backgroundColor: "#3b82f6",
  },

  button: {
    backgroundColor: "#3b82f6",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  disabledBtn: {
    opacity: 0.5,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
  },
});