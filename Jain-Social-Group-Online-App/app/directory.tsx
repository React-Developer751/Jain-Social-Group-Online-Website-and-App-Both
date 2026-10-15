import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ScrollView, StatusBar} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Star, MapPin, Phone, Globe, ChevronRight, ListFilter as Filter, UserCheck } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import { DIRECTORY_ITEMS } from '@/data/dummyData';
import {getAllUsersPaged} from "@/service/auth";
import { getSocket } from '@/socket/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkeletonList } from "@/components/ui/Skeleton";

const CATEGORIES = ['All', 'Design', 'Fitness', 'Food', 'Tech', 'Services'];

export default function DirectoryScreen() {
  const socket = getSocket();
  const [search, setSearch] = useState('');
  // True until this screen's first request settles, so the empty message is
  // only shown once we actually know the list is empty.
  const [listLoading, setListLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
   const [businesses, setBusinesses] = useState<any[]>([]);
  const [view, setView] = useState<"grid" | "table">("table");
  const [skills, setSkills] = useState<string[]>([]);

    const filtered = businesses?.filter(biz => {
    // Search filter
    const query = search.toLowerCase();
    const fieldsToCheck = [
      biz.businessName,
      biz.businessDescription,
      biz.businessAddress,
      biz.businessCategory,
      biz.ownerName
    ];

    const matchesSearch = fieldsToCheck.some(field => field?.toLowerCase().includes(query));

    // Category filter
    const matchesCategory = activeCategory === 'all' || biz.businessCategory?.toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });


   useEffect(() => {
    if (!socket) return;
    socket.on("businessVerify", () => {
      handleGetAllUser();
    });
    socket.on("businessUpdate", () => {
      handleGetAllUser();
    });
    return () => {
      socket.off("businessVerify");
      socket.off("businessUpdate");
    }
  }, []);

   const handleGetAllUser = async () => {
    const userData = await AsyncStorage.getItem("user");
    const userId = userData ? JSON.parse(userData)?._id : null;
    if(!userId) { setListLoading(false); return; }
     try {
      // The directory lists every verified business, so it walks all pages
      // rather than showing whichever members land on page one.
      const allUsers = await getAllUsersPaged(userId);
      {

        // Flatten all businesses from verified users/accounts
        const flattened = allUsers.reduce((acc: any[], user: any) => {
          if (user.accountType === "business" && user.businesses) {
            const verifiedBusinesses = user.businesses
              .filter((biz: any) => biz.isVerified === "verified")
              .map((biz: any) => ({
                ...biz,
                ownerId: user._id,
                ownerName: user.fullName,
                ownerEmail: user.email,
                ownerImage: user.profileImage || user.coverImage
              }));
            return [...acc, ...verifiedBusinesses];
          }
          return acc;
        }, []);

        setBusinesses(flattened);

        // Extract unique categories for filter
        const uniqueCategories = [...new Set(flattened.map((b: any) => b.businessCategory).filter(Boolean))];
        setSkills(uniqueCategories as string[]);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    handleGetAllUser();
  }, []);

  // const filtered = DIRECTORY_ITEMS.filter(d =>
  //   d.name.toLowerCase().includes(search.toLowerCase())
  // );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        color={i < Math.floor(rating) ? Colors.warning : Colors.gray600}
        fill={i < Math.floor(rating) ? Colors.warning : 'transparent'}
        size={14}
      />
    ));
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item?.businessCoverImage }} style={styles.cardImage} />
      <View style={[styles.openBadge]}>
        <Text style={styles.openBadgeText}>{"Verified"}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item?.businessName}</Text>
            <Text style={styles.cardCategory}>{item?.businessCategory}</Text>
          </View>
          <View style={styles.ratingWrap}>
            <Star color={Colors.warning} fill={Colors.warning} size={14} />
            <Text style={styles.ratingText}>{item?.rating}</Text>
            <Text style={styles.reviewCount}>({item.reviews})</Text>
          </View>
        </View>
        <View style={styles.starsRow}>{renderStars(item.rating)}</View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item?.businessDescription}</Text>
        <View style={styles.cardMeta}>
          <MapPin color={Colors.gray500} size={14} />
          <Text style={styles.cardMetaText}>{item?.businessAddress}</Text>
          <Phone color={Colors.gray500} size={14} />
          <Text style={styles.cardMetaText}>{item?.businessPhone}</Text>
        </View>
        <View style={styles.cardAddress}>
          <Globe color={Colors.gray500} size={14} />
          <Text style={styles.cardMetaText} numberOfLines={1}>{item?.website}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.callBtn}>
            <Phone color={Colors.white} size={16} />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.detailBtn}>
            <Text style={styles.detailBtnText}>View Details</Text>
            <ChevronRight color={Colors.primary} size={16} />
          </TouchableOpacity> */}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.light.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Directory</Text>
        <TouchableOpacity style={styles.filterBtn}>
          <Filter color={Colors.primary} size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search color={Colors.gray500} size={18} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search businesses..."
          placeholderTextColor={Colors.gray500}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
        style={{ marginBottom: 8, minHeight:35 , maxHeight:36 }}
      >
       { filtered?.length > 0 &&  <TouchableOpacity
            key={"all"}
            style={[styles.catChip, activeCategory === "all" && styles.catChipActive]}
            onPress={() => setActiveCategory("all")}
          >
            <Text style={[styles.catChipText, activeCategory === "all" && styles.catChipTextActive]}>
              {"All"}
            </Text>
          </TouchableOpacity>}
        {skills?.map(cat => (
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
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(d:any) => d?._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          listLoading ? (
            <SkeletonList variant="row" count={6} />
          ) : (
            <View style={styles.emptyState}>
              <UserCheck color={Colors.gray600} size={56} />
              <Text style={styles.emptyTitle}>No business listings yet</Text>
              <Text style={styles.emptySubtitle}>
                Members who add a verified business will be listed here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: Colors.light.text, fontSize: Typography.fontSizes['2xl'], fontWeight: Typography.fontWeights.bold },
  filterBtn: { padding: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: { flex: 1, color: Colors.light.text, fontSize: Typography.fontSizes.base },
  categoriesScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.medium },
  catChipTextActive: { color: Colors.white },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  openBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closedBadge: { backgroundColor: Colors.error },
  openBadgeText: { color: Colors.white, fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semibold },
  cardBody: { padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  cardName: { color: Colors.light.text, fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.bold, marginBottom: 2 },
  cardCategory: { color: Colors.gray500, fontSize: Typography.fontSizes.sm },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.light.text, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold },
  reviewCount: { color: Colors.gray500, fontSize: Typography.fontSizes.sm },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  cardDesc: { color: Colors.gray600, fontSize: Typography.fontSizes.base, lineHeight: 20, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardMetaText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, flex: 1 },
  cardAddress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  cardActions: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  callBtnText: { color: Colors.white, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
  },
  detailBtnText: { color: Colors.primary, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
 emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { color: Colors.light.text, fontSize: Typography.fontSizes.lg, fontWeight: Typography.fontWeights.semibold },
  emptySubtitle: { color: Colors.gray600, fontSize: Typography.fontSizes.base },
});
