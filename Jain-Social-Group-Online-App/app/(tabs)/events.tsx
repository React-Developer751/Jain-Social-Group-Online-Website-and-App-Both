import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Search, Plus, MapPin, Clock, Calendar, Users, Tag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import { EVENTS } from '@/data/dummyData';
import Avatar from '@/components/ui/Avatar';
import { getEvent } from "@/service/event";
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import { setEventList, setInterestedOrNotInterestedCandidate, setNewEvent } from "@/redux-toolkit/slice/eventSlice";
import { getEventStatus } from "@/service/global";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { interestedOrNotInterestedFromEvent } from "@/service/event";
import { getSocket } from '@/socket/socket';
import { SkeletonList } from "@/components/ui/Skeleton";

export default function EventsScreen() {
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const eventList = useAppSelector((state) => state?.event?.eventList);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  // True until this screen's first request settles, so the empty message is
  // only shown once we actually know the list is empty.
  const [listLoading, setListLoading] = useState(true);

  const filtered = eventList?.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'all' || e.category === activeCategory;
    return matchSearch && matchCat;
  });
  const categoryList = [...new Set(eventList?.map((e) => e?.category))];

  useEffect(() => {
    if(!socket)return;
    socket.on("event", (data:any) => {
      dispatch(setNewEvent(data));
    })
    return () => {
      socket.off("event")
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    getUser();
  }, []);

  const handleinterestedOrNotInterestedFromEvent = async (eventId: string) => {
    try {
      const obj = { eventId: eventId, userId: user?._id };
      setLoading(true);
      const res = await interestedOrNotInterestedFromEvent(obj);
      if (res.status === 200) {
        Alert.alert("Event Join Successfully.", res?.data?.message);
        dispatch(setInterestedOrNotInterestedCandidate(obj));
        if(socket) {
           socket.emit("interestedcandidateFromEvent", obj);
        }
      }
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Event Join Failed.", err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetEvents = async () => {
    try {
      const res = await getEvent();
      if (res.status === 200) {
        dispatch(setEventList(res?.data?.event));
      }
    } catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (filtered?.length === 0) {
      handleGetEvents()
    }
  }, [filtered?.length]);

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n?.toString();
  };

  const renderEvent = ({ item }: any) => {
    const eventStatus = getEventStatus(item?.date);
    const isJoined = item?.interestedCandidate?.includes(user?._id);
    const eventDate = new Date(item?.date)?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const eventTime = new Date(item?.date)?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push({ pathname: '/event/[id]', params: { id: item?._id } } as any)}
      >
        {<Image source={{ uri: item?.coverImage?.[0] }} style={styles.eventBanner} />}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bannerOverlay}
        />
        {/* Price badge */}
        <View style={[styles.priceBadge, item?.isFree && styles.freeBadge]}>
          <Text style={styles.priceBadgeText}>{eventStatus}</Text>
        </View>
        {/* Category badge */}
        <View style={styles.categoryBadge}>
          <Tag color={Colors.white} size={10} />
          <Text style={styles.categoryBadgeText}>{item?.category}</Text>
        </View>

        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>{item?.title}</Text>
          <View style={styles.metaRow}>
            <Calendar color={Colors.primary} size={14} />
            <Text style={styles.metaText}>{eventDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock color={Colors.gray500} size={14} />
            <Text style={styles.metaText}>{eventTime}</Text>
          </View>
          <View style={styles.metaRow}>
            <MapPin color={Colors.gray500} size={14} />
            <Text style={styles.metaText} numberOfLines={1}>{item?.location}</Text>
          </View>
          <View style={styles.eventFooter}>
            <View style={styles.organizerRow}>
              <Avatar uri={item?.organizer?.avatar} size={24} />
              <Text style={styles.organizerName}>{item?.organizer?.name}</Text>
            </View>
            <View style={styles.attendees}>
              <Users color={Colors.gray400} size={14} />
              <Text style={styles.attendeesText}>{formatCount(item?.interestedCandidate?.length)} going</Text>
            </View>
          </View>
          <View style={styles.actionRow}>

            <TouchableOpacity
              onPress={() => {
                handleinterestedOrNotInterestedFromEvent(item?._id);
              }}
              disabled={eventStatus === "past" || loading}
              style={[
                styles.attendBtn,
                isJoined && styles.attendBtnActive,
                eventStatus === "past" && {
                  backgroundColor: Colors.gray500,
                },
                loading && {
                  opacity: 0.7,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.attendBtnText}>
                  {eventStatus === "past"
                    ? "Ended"
                    : isJoined
                      ? "Joining"
                      : "Join"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    )
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity style={styles.createBtn}>
          {/* <Plus color={Colors.primary} size={22} /> */}
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search color={Colors.gray500} size={18} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search events..."
          placeholderTextColor={Colors.gray500}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
        style={styles.categoriesContainer}
      >
      {categoryList?.length > 0 &&  <TouchableOpacity
          key={"all"}
          style={[styles.catChip, activeCategory === "all" && styles.catChipActive]}
          onPress={() => setActiveCategory("all")}
        >
          <Text style={[styles.catChipText, activeCategory === "all" && styles.catChipTextActive]}>
            ALL
          </Text>
        </TouchableOpacity>}

        {categoryList?.map(cat => (
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
        keyExtractor={(e:any) => e._id}
        renderItem={renderEvent}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() =>
          listLoading ? (
            <SkeletonList variant="tile" count={4} />
          ) : (
            <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 32 }}>
              <Text style={{ color: Colors.gray700, fontSize: 16, fontWeight: '600' }}>No events yet</Text>
              <Text style={{ color: Colors.gray500, fontSize: 14, marginTop: 6, textAlign: 'center' }}>
                Club events will appear here once they are scheduled.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
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
  searchInput: { flex: 1, color: Colors.gray900, fontSize: Typography.fontSizes.base },
  categoriesContainer: { marginBottom: 8, minHeight: 35, maxHeight: 36 },
  categoriesScroll: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.medium },
  catChipTextActive: { color: Colors.white },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  eventBanner: { width: '100%', height: 180, resizeMode: 'cover' },
  bannerOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 120,
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  freeBadge: { backgroundColor: Colors.success },
  priceBadgeText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },
  categoryBadge: {
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
  categoryBadgeText: { color: Colors.white, fontSize: Typography.fontSizes.xs },
  eventInfo: { padding: 16, gap: 8 },
  eventTitle: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    lineHeight: 24,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm, flex: 1 },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  organizerName: { color: Colors.gray700, fontSize: Typography.fontSizes.sm },
  attendees: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeesText: { color: Colors.gray600, fontSize: Typography.fontSizes.sm },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  interestedBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 9,
    alignItems: 'center',
  },
  interestedBtnActive: { backgroundColor: Colors.primary + '20' },
  interestedBtnText: { color: Colors.primary, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  interestedBtnTextActive: { color: Colors.primary },
  attendBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 9,
    alignItems: 'center',
  },
  attendBtnActive: { backgroundColor: Colors.success },
  attendBtnText: { color: Colors.white, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
});
