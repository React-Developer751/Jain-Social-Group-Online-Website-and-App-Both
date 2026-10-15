import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, Typography, BorderRadius } from "@/constants/theme";
import { convertPremiumUser } from "@/service/auth";
import { useAppDispatch } from "@/redux-toolkit/customHook/hook";
import { setUserData } from "@/redux-toolkit/slice/userSlice";

export default function PaymentDialog({ visible, setVisible }: any) {
  const dispatch = useAppDispatch();

  const [image, setImage] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<any>(null);

  const resetForm = () => {
    setImage(null);
    setPreview(null);
    setNumber("");
    setAmount("");
  };

  // PICK IMAGE (RN STYLE)
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const file = result.assets[0];
      setImage(file);
      setPreview(file.uri);
    }
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  const handleSubmit = async () => {
    if (!image || !number || !amount) return;

    setLoading(true);

    try {
      const user = JSON.parse(await import("@react-native-async-storage/async-storage")
        .then(m => m.default.getItem("user")) as any);

      const formData = new FormData();
      formData.append("userId", user?._id);
      formData.append("paymentImage", {
        uri: image.uri,
        name: "payment.jpg",
        type: "image/jpeg",
      } as any);
      formData.append("amount", amount);
      formData.append("transitionNumber", number);

      const res = await convertPremiumUser(formData);

      if (res.status === 200) {
        Alert.alert("User converted to premium successfully.", res?.data?.message);
        dispatch(setUserData(res?.data?.data));
        setVisible(false);
        resetForm();
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment Confirmation</Text>

            <TouchableOpacity onPress={() => setVisible(false)}>
              <X color={Colors.black} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* IMAGE PICKER */}
            <View style={styles.section}>
              <Text style={styles.label}>Upload Screenshot</Text>

              <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                <Text style={{ color: Colors.primary }}>
                  Select Image
                </Text>
              </TouchableOpacity>

              {preview && (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: preview }} style={styles.preview} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={removeImage}
                  >
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* AMOUNT */}
            <View style={styles.section}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                placeholderTextColor="#777"
                style={styles.input}
                keyboardType="numeric"
              />
            </View>

            {/* NUMBER */}
            <View style={styles.section}>
              <Text style={styles.label}>Transaction Number</Text>
              <TextInput
                value={number}
                onChangeText={setNumber}
                placeholder="Enter transaction number"
                placeholderTextColor={Colors.gray500}
                style={styles.input}
                keyboardType="numeric"
              />
            </View>

            {/* BUTTON */}
            <TouchableOpacity
              disabled={loading}
              onPress={handleSubmit}
            >
              <LinearGradient
                colors={
                  loading
                    ? ["#666", "#666"]
                    : Colors.gradients.primary
                }
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Submit</Text>
                )}
              </LinearGradient>
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "90%",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    alignItems: "center",
  },

  title: {
    color: Colors.black,
    fontSize: 20,
    fontWeight: "700",
  },

  section: {
    marginBottom: 16,
  },

  label: {
    color: Colors.gray700,
    marginBottom: 8,
    fontSize: Typography.fontSizes.base,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: BorderRadius.xl,
    padding: 12,
    color: Colors.black,
  },

  uploadBox: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },

  previewWrap: {
    marginTop: 10,
    position: "relative",
    width: 100,
    height: 100,
  },

  preview: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },

  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "red",
    borderRadius: 12,
    padding: 4,
  },

  button: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },

  btnText: {
    color: "#fff",
    fontWeight: "700",
  },
});