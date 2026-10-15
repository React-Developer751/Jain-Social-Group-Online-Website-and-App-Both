
import React, { useEffect, useState } from "react";
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import { addPost } from "@/service/post";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {setNewPost} from "@/redux-toolkit/slice/postSlice";
import { useAppDispatch } from "@/redux-toolkit/customHook/hook";
import {BackHandler} from "react-native";


interface MediaItem {
  uri: string;
  type: "image" | "video";
}

interface Props {
  visible: boolean;
  onClose: () => void;
  initialData?: any;
  setPostListRefresh?: (value : boolean)  => void;
}

const PostDialog = ({ visible, onClose, initialData, setPostListRefresh}: Props) => {
    const dispatch = useAppDispatch();
  const isEdit = Boolean(initialData);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("public");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);


 useEffect(() => {
  if (!visible) return;

  const backAction = () => {
    onClose(); // Close the dialog
    return true;
  };

  const subscription = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction
  );

  return () => subscription.remove();
}, [visible, onClose]);

useEffect(() => {
  if (initialData && visible) {
    setTitle(initialData?.title || "");
    setDescription(initialData?.description || "");
    setType(initialData?.type || "public");

    if (initialData?.images && Array.isArray(initialData.images)) {
      const formattedMedia: MediaItem[] = initialData.images.map((url: string) => {
        const isVideo = url.includes("/video/upload/"); 
        return {
          uri: url,
          type: isVideo ? "video" : "image"
        };
      });
      
      setMedia(formattedMedia);
    }
  } else if (visible) {
    resetForm();
  }
}, [visible, initialData]);


  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("public");
    setMedia([]);
  };

  // PICK IMAGE / VIDEO
  const pickMedia = async () => {
    try {
      if (media.length >= 3) {
        Alert.alert("Limit Reached", "Maximum 3 files allowed");
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert( "Permission Required", "Gallery permission is required" );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: ["images", "videos"], allowsMultipleSelection: true, quality: 1,});

      if (!result.canceled) {
        const selected: MediaItem[] = result.assets.map(
          (item: any) => ({ uri: item.uri, type: item.type === "video" ? "video" : "image"})
        );

        // PREVIEW + STATE UPDATE
        setMedia((prev) => {
          const updated = [...prev, ...selected];

          if (updated.length > 3) {
            Alert.alert( "Limit Reached", "Maximum 3 files allowed");
            return updated.slice(0, 3);
          }

          return updated;
        });
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to pick media");
    }
  };

  // REMOVE MEDIA
  const removeMedia = (index: number) => {
    const updated = [...media];

    updated.splice(index, 1);

    setMedia(updated);
  };

  // SUBMIT
  const handleSubmit = async () => {
    const user = await AsyncStorage.getItem("user").then(res => res ? JSON.parse(res) : null);

    if (!title.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Validation Error",
        "Description is required"
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("title", title);
      formData.append("description", description);
      formData.append("type", type);
      formData.append("userId", user?._id);

      media.forEach((item, index) => {
        const extension =
          item.type === "video" ? "mp4" : "jpg";

        formData.append("images", {
          uri: item.uri,
          name: `media_${index}.${extension}`,
          type: item.type === "video" ? "video/mp4" : "image/jpeg",
        } as any);
      });

      // API CALL
      const res = await addPost(formData);

      // SUCCESS
      if (res?.status === 201 || res?.status === 200) {
        dispatch(setNewPost(res?.data?.post));
        Alert.alert( "Success", res?.data?.message || (isEdit ? "Post Updated Successfully" : "Post Created Successfully"));

        setPostListRefresh?.(true);

        resetForm();

        onClose();
      }
    } catch (error: any) {
      console.log(error);

      Alert.alert( "Post Error", error?.response?.data?.message || error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: "#fff",
          padding: 20,
          paddingTop: 60,
        }}
      >
        {/* HEADER */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 20,
          }}
        >
          {isEdit ? "Update Post" : "Create Post"}
        </Text>

        {/* TITLE */}
        <Text
          style={{
            marginBottom: 6,
            fontWeight: "600",
          }}
        >
          Title
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter title"
          editable={!loading}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            padding: 12,
            marginBottom: 15,
          }}
        />

        {/* DESCRIPTION */}
        <Text
          style={{
            marginBottom: 6,
            fontWeight: "600",
          }}
        >
          Description
        </Text>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          editable={!loading}
          multiline
          numberOfLines={4}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            padding: 12,
            height: 120,
            textAlignVertical: "top",
            marginBottom: 15,
          }}
        />

        {/* TYPE */}
        <Text
          style={{
            marginBottom: 10,
            fontWeight: "600",
          }}
        >
          Post Type
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            disabled={loading}
            onPress={() => setType("public")}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor:
                type === "public"
                  ? "#000"
                  : "#eee",
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color:
                  type === "public"
                    ? "#fff"
                    : "#000",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Public
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loading}
            onPress={() => setType("private")}
            style={{
              flex: 1,
              padding: 12,
              backgroundColor:
                type === "private"
                  ? "#000"
                  : "#eee",
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color:
                  type === "private"
                    ? "#fff"
                    : "#000",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Private
            </Text>
          </TouchableOpacity>
        </View>

        {/* PICK MEDIA */}
        <TouchableOpacity
          disabled={loading}
          onPress={pickMedia}
          style={{
            backgroundColor: "#000",
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            Pick Images / Videos
          </Text>
        </TouchableOpacity>

        {/* PREVIEW */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 30,
          }}
        >
          {media.map((item, index) => (
            <View key={index}>
              {/* IMAGE */}
              {item.type === "image" && (
                <Image
                  source={{ uri: item.uri }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 10,
                  }}
                />
              )}

              {/* VIDEO */}
              {item.type === "video" && (
                <Video
                  source={{ uri: item.uri }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 10,
                  }}
                  useNativeControls
                //   resizeMode="cover"
                  isLooping
                />
              )}

              {/* REMOVE BUTTON */}
              <TouchableOpacity
                disabled={loading}
                onPress={() => removeMedia(index)}
                style={{
                  position: "absolute",
                  top: -5,
                  right: -5,
                  backgroundColor: "red",
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                  }}
                >
                  X
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* BUTTONS */}
        <View
          style={{
            flexDirection: "row",
            gap: 10,
          }}
        >
          {/* CANCEL */}
          <TouchableOpacity
            disabled={loading}
            onPress={onClose}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: "#ddd",
              borderRadius: 10,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          {/* SUBMIT */}
          <TouchableOpacity
            disabled={loading}
            onPress={handleSubmit}
            style={{
              flex: 1,
              padding: 14,
              backgroundColor: "#000",
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {isEdit ? "Update" : "Create"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
};

export default PostDialog;