// components/groups/CreateGroupModal.tsx

import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { createGroup, updateGroup } from "@/service/group";

import { Colors, Typography, BorderRadius } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppDispatch } from "@/redux-toolkit/customHook/hook";
import { setNewGroup } from "@/redux-toolkit/slice/businessGroupSlice";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
  initialData?: any;
}

export default function CreateGroupModal({
  visible,
  onClose,
  onSubmit,
  initialData,
}: Props) {
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (initialData && visible) {

      setTitle(initialData.title || "");
      setDescription(initialData.description || "");

      // existing preview
      const existing =
        initialData?.images?.map((url: string) => ({
          uri: url,
          type: url.endsWith(".mp4") ? "video" : "image",
        })) || [];

      setExistingImages(existing);
      setNewImages([]);
    }
  }, [visible, initialData]);

  // PICK IMAGES
  const pickImages = async () => {
    try {
      if (newImages.length >= 4) {
        Alert.alert("Limit Reached", "Maximum 4 images allowed.");
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 4 - newImages.length,
      });

      if (!result.canceled) {
        const selected = result.assets;

        setNewImages((prev) => [...prev, ...selected].slice(0, 4));
      }
    } catch (error) {
      console.log(error);
    }
  };

  // REMOVE IMAGE
  const removeExistingImage = (index: number) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  const removeNewImage = (index: number) => {
    const updated = [...newImages];
    updated.splice(index, 1);
    setNewImages(updated);
  };

  // SUBMIT
  const handleCreateGroup = async () => {
    const userData = await AsyncStorage.getItem("user");
    const userId = userData ? JSON.parse(userData)?._id : null;
    if (!title.trim()) {
      Alert.alert("Title is required");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Description is required");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("createdBy", userId);
      if (isEdit) {
        formData.append("id", initialData?._id);
      }
      const allImages = [
        ...existingImages,
        ...newImages
      ];

      allImages.forEach((file, index) => {
        if (file.uri) {
          const mimeType =
            file.mimeType ||
            (file.uri.endsWith(".png") ? "image/png" : "image/jpeg");

          formData.append("media", {
            uri: file.uri,
            name: file.fileName || `image-${index}.jpg`,
            type: mimeType,
          } as any);
        }
      });
      setLoading(true);
      const res = await (isEdit ? updateGroup(formData) : createGroup(formData));

      if (res.status === 201 || res.status === 200) {
        Alert.alert("Group Created Successfully.", res?.data?.message);
        dispatch(setNewGroup(res.data.group));
        setTitle("");
        setDescription("");
        setExistingImages([]);
        setNewImages([]);
        onClose();
      }
    } catch (error: any) {
      console.log(error?.reponse?.data?.message);
      Alert.alert("Group Create Failed.", error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.heading}>{isEdit ? "Update Group" : "Create Group"}</Text>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* TITLE */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Group Title</Text>

              <TextInput
                placeholder="Enter group title"
                placeholderTextColor="#777"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
              />
            </View>

            {/* DESCRIPTION */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Description</Text>

              <TextInput
                placeholder="Enter group description"
                placeholderTextColor="#777"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
              />
            </View>

            {/* IMAGE PICKER */}
            <View style={styles.inputWrapper}>
              <View style={styles.imageTopRow}>
                <Text style={styles.label}>Images</Text>

                <Text style={styles.countText}>
                  {existingImages.length + newImages.length}/4
                </Text>
              </View>

              <TouchableOpacity
                style={styles.imagePicker}
                onPress={pickImages}
              >
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={"#000"}
                />

                <Text style={styles.pickText}>
                  Select Images
                </Text>
              </TouchableOpacity>

              {/* PREVIEW */}
              <View style={styles.previewContainer}>
                {existingImages.map((img, index) => (
                  <View key={index} style={styles.previewWrapper}>
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.previewImage}
                    />

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeExistingImage(index)}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                {newImages.map((img, index) => (
                  <View key={index} style={styles.previewWrapper}>
                    <Image
                      source={{ uri: img.uri || img.url }}
                      style={styles.previewImage}
                    />

                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => removeNewImage(index)}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* BUTTON */}
           <TouchableOpacity
  disabled={loading}
  onPress={handleCreateGroup}
  activeOpacity={0.8}
  style={{
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 30,
    opacity: loading ? 0.7 : 1,
  }}
>
  {loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.buttonText}>
      {isEdit ? "Update Group" : "Create Group"}
    </Text>
  )}
</TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "90%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  heading: {
    color: "#000",
    fontSize: 22,
    fontWeight: "700",
  },

  inputWrapper: {
    marginBottom: 18,
  },

  label: {
    color: "#000",
    marginBottom: 10,
    fontSize: Typography.fontSizes.base,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#000",
    fontSize: 15,
  },

  textArea: {
    height: 120,
  },

  imagePicker: {
    height: 120,
    borderWidth: 1.5,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff"
  },

  pickText: {
    color: "#000",
    fontWeight: "600",
  },

  previewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },

  previewWrapper: {
    position: "relative",
  },

  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },

  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "red",
    alignItems: "center",
    justifyContent: "center",
  },

  imageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  countText: {
    color: "#666",
    fontSize: 13,
  },

  button: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 30,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});