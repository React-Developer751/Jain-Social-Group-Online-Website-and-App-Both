import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import { Colors } from '@/constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title?: string;
  description?: string;
  buttonName?: string;
  loading?: boolean;
}

const ConfirmDialog = ({
  visible,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  description = 'Are you sure you want to continue?',
  buttonName = 'Confirm',
  loading = false,
}: ConfirmDialogProps) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      {/* Backdrop */}
      <View style={styles.overlay}>
        <View style={styles.card}>
          
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Description */}
          <Text style={styles.desc}>{description}</Text>

          {/* Buttons */}
          <View style={styles.actions}>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{buttonName}</Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmDialog;


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 10,
  },

  desc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#ddd",
    borderRadius: 10,
  },

  cancelText: {
    color: "#000",
    fontWeight: "600",
  },
confirmBtn: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  backgroundColor: "#EF4444", // ya tumhara preferred red
  borderRadius: 10,
  opacity: 1,
},

  confirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});