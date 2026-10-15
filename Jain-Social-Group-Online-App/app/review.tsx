import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, StatusBar, Modal, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Star, ThumbsUp, CreditCard as Edit, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { REVIEWS } from '@/data/dummyData';
import GradientButton from '@/components/ui/GradientButton';
import { addReviews, getReviews, getGlobalReviews } from "@/service/review";
import { useAppDispatch, useAppSelector } from "@/redux-toolkit/customHook/hook";
import { setNewReview, setReviewList } from "@/redux-toolkit/slice/reviewSlice";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from "react-native";
import { getSocket } from '@/socket/socket';


export default function ReviewScreen() {
  const socket = getSocket();
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null)
  const dispatch = useAppDispatch();
  const reviews = useAppSelector((state) => state?.reviews?.reviewsList);

  useEffect(() => {
    if (!socket) return;
    socket.on("updateReview", (data: any) => {
      console.log("updateReview", data);
      dispatch(setNewReview(data));
    });

    return () => {
      socket.off("updateReview");
    }
  }, [])


  const handleSubmit = async () => {
    if (!reviewText.trim() && !user?._id) return;
    const obj = {
      userId: user?._id,
      message: reviewText,
      rating: selectedRating,
    };
    try {
      setIsLoading(true);
      const res = await addReviews(obj);
      if (res.status === 201) {
        console.log("new review", res?.data?.review);
        Alert.alert("Review send successfully.", res?.data?.message);
        dispatch(setNewReview(res?.data?.review));
        setShowWriteReview(false);
        setReviewText("");
      }
    } catch (error: any) {
      console.log(error);
      Alert.alert("Review send failed.", error?.response?.data?.message || error?.message);
    }
    finally {
      setIsLoading(false);
    }
  };

  const getAllReviews = async () => {
    if (!user?._id) return;
    try {
      const res = await getReviews(user?._id);
      if (res.status === 200) {
        dispatch(setReviewList(res?.data?.reviews));
      }
    } catch (error: any) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (reviews?.length === 0 && user?._id) {
      getAllReviews();
    }
  }, [user?._id, reviews?.length]);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    getUser();
  }, [])

  const avgRating = REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length;
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: REVIEWS.filter(rv => rv.rating === r).length,
  }));

  const renderStars = (rating: number, size = 16) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        color={i < rating ? Colors.warning : Colors.gray600}
        fill={i < rating ? Colors.warning : 'transparent'}
        size={size}
      />
    ));

  const renderReview = ({ item }: any) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar uri={item?.user?.avatar || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={44} />
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewerName}>{item?.userId?.fullName || "You"}</Text>
          <View style={styles.reviewStars}>{renderStars(item?.rating, 14)}</View>
          <Text style={styles.reviewTimestamp}>{new Date(item?.createdAt).toLocaleString()}</Text>
        </View>
        <View
          style={[
            styles.categoryLabel,
            item?.status === "approved"
              ? { backgroundColor: "#22c55e20" }
              : item?.status === "rejected"
                ? { backgroundColor: "#ef444420" }
                : { backgroundColor: "#f59e0b20" }
          ]}
        >
          <Text
            style={[
              styles.categoryLabelText,
              item?.status === "approved"
                ? { color: "#22c55e" }
                : item?.status === "rejected"
                  ? { color: "#ef4444" }
                  : { color: "#f59e0b" }
            ]}
          >
            {item?.status?.charAt(0).toUpperCase() + item?.status?.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.reviewText}>{item?.message}</Text>
      {item?.adminReply && (
        <View
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            backgroundColor: "rgba(59,130,246,0.1)",
            borderWidth: 1,
            borderColor: "rgba(59,130,246,0.3)",
          }}
        >
          <Text
            style={{
              color: "#60a5fa",
              fontWeight: "600",
              marginBottom: 4,
            }}
          >
            Admin Reply
          </Text>

          <Text
            style={{
              color: Colors.gray300,
            }}
          >
            {item.adminReply}
          </Text>
        </View>
      )}

    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.white} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <TouchableOpacity style={styles.writeBtn} onPress={() => setShowWriteReview(true)}>
          <Edit color={Colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(r: any) => r?._id}
        renderItem={renderReview}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Stats Card */}
            <LinearGradient
              colors={['#1A1A2E', '#16213E']}
              style={styles.statsCard}
            >
              <View style={styles.statsLeft}>
                <Text style={styles.bigRating}>{avgRating.toFixed(1)}</Text>
                <View style={styles.starsRow}>{renderStars(Math.round(avgRating), 20)}</View>
                <Text style={styles.totalReviews}>{REVIEWS.length} reviews</Text>
              </View>
              <View style={styles.statsRight}>
                {ratingCounts.map(({ rating, count }) => (
                  <View key={rating} style={styles.ratingBar}>
                    <Text style={styles.ratingBarLabel}>{rating}</Text>
                    <Star color={Colors.warning} fill={Colors.warning} size={12} />
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${(count / REVIEWS.length) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.ratingBarCount}>{count}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => setShowWriteReview(true)}
            >
              <Edit color={Colors.primary} size={18} />
              <Text style={styles.writeReviewBtnText}>Write a Review</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Write Review Modal */}
      <Modal visible={showWriteReview} transparent animationType="slide" onRequestClose={() => setShowWriteReview(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowWriteReview(false)}>
                <X color={Colors.gray400} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.ratingSelector}>
              <Text style={styles.ratingPrompt}>How would you rate your experience?</Text>
              <View style={styles.starSelector}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setSelectedRating(s)}>
                    <Star
                      color={s <= selectedRating ? Colors.warning : Colors.gray600}
                      fill={s <= selectedRating ? Colors.warning : 'transparent'}
                      size={40}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={styles.reviewInput}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Share your experience..."
              placeholderTextColor={Colors.gray500}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={{
                margin: 16,
                backgroundColor: Colors.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleSubmit}
              disabled={!selectedRating || !reviewText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: Colors.white, fontSize: Typography.fontSizes['2xl'], fontWeight: Typography.fontWeights.bold },
  writeBtn: { padding: 4 },
  statsCard: {
    borderRadius: BorderRadius['2xl'],
    padding: 20,
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statsLeft: { alignItems: 'center', marginRight: 24, justifyContent: 'center' },
  bigRating: { color: Colors.white, fontSize: Typography.fontSizes['5xl'], fontWeight: Typography.fontWeights.bold },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 6 },
  totalReviews: { color: Colors.gray500, fontSize: Typography.fontSizes.sm, marginTop: 6 },
  statsRight: { flex: 1, gap: 6, justifyContent: 'center' },
  ratingBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarLabel: { color: Colors.gray300, fontSize: Typography.fontSizes.sm, width: 10 },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.dark.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: Colors.warning, borderRadius: 3 },
  ratingBarCount: { color: Colors.gray500, fontSize: Typography.fontSizes.xs, width: 16, textAlign: 'right' },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: 13,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  writeReviewBtnText: { color: Colors.primary, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold },
  reviewCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  reviewMeta: { flex: 1 },
  reviewerName: { color: Colors.white, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold, marginBottom: 4 },
  reviewStars: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  reviewTimestamp: { color: Colors.gray500, fontSize: Typography.fontSizes.xs },
  categoryLabel: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryLabelText: { color: Colors.primary, fontSize: Typography.fontSizes.xs },
  reviewText: { color: Colors.gray300, fontSize: Typography.fontSizes.base, lineHeight: 22, marginBottom: 12 },
  reviewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.dark.border, paddingTop: 10 },
  helpfulBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helpfulText: { color: Colors.gray500, fontSize: Typography.fontSizes.sm },
  replyBtn: { color: Colors.primary, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.dark.border, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: { color: Colors.white, fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.semibold },
  ratingSelector: { alignItems: 'center', paddingVertical: 20 },
  ratingPrompt: { color: Colors.gray300, fontSize: Typography.fontSizes.base, marginBottom: 16 },
  starSelector: { flexDirection: 'row', gap: 8 },
  reviewInput: {
    backgroundColor: Colors.dark.surfaceSecondary,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginHorizontal: 16,
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
});
