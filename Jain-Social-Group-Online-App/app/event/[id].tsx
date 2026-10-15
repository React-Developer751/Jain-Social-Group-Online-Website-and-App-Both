import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Share2, Bookmark, Star, Tag, ChevronRight} from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { EVENTS, USERS } from '@/data/dummyData';
import GradientButton from '@/components/ui/GradientButton';
import {getSingleEvent} from "@/service/event";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { interestedOrNotInterestedFromEvent } from "@/service/event";
import { Alert } from 'react-native';
import { useAppDispatch } from '@/redux-toolkit/customHook/hook';
import {setInterestedOrNotInterestedCandidate } from "@/redux-toolkit/slice/eventSlice";
import { getEventStatus } from "@/service/global";
import {BackHandler} from "react-native";

export default function EventDetailScreen() {
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();
    const [event, setEvent] = useState<any | null>(null);
  const [isAttending, setIsAttending] = useState();
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState<any | null>(null);
   const [loading, setLoading] = useState<boolean>(false);
   const eventStatus = event?.date ? getEventStatus(event.date) : "upcoming";
   const isPast = eventStatus === "past";

   const eventDate = new Date(event?.date)?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const eventTime = new Date(event?.date)?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

    useEffect(() => {
      const backAction = () => {
        return true;
      };
     const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);

     return () => subscription.remove();
    },[])

   const handleinterestedOrNotInterestedFromEvent = async (eventId: string) => {
  try {
    setLoading(true);

    const obj = { eventId, userId: user?._id };

    const res = await interestedOrNotInterestedFromEvent(obj);

    if (res.status === 200) {
      Alert.alert("Success", res?.data?.message);

      setEvent((prevEvent: any) => {
        if (!prevEvent) return prevEvent;

        const alreadyJoined = prevEvent.interestedCandidate?.some(
          (u: any) => u?._id === user?._id
        );

        let updatedCandidates;

        if (alreadyJoined) {
          // REMOVE user
          updatedCandidates = prevEvent.interestedCandidate.filter(
            (u: any) => u?._id !== user?._id
          );
        } else {
          // ADD user
          updatedCandidates = [
            ...prevEvent.interestedCandidate,
            {
              _id: user?._id,
              profileImage: user?.profileImage,
            },
          ];
        }

        return {
          ...prevEvent,
          interestedCandidate: updatedCandidates,
        };
      });

      dispatch(setInterestedOrNotInterestedCandidate(obj));
    }
  } catch (err: any) {
    console.log(err?.response?.data?.message || err?.message);
    Alert.alert(
      "Event Join Failed.",
      err?.response?.data?.message || err?.message
    );
  } finally {
    setLoading(false);
  }
};

  const handleGetSingleEvent = async(id:string) => {
    if(!id) return;
    try{
     const res = await getSingleEvent(id);
     if(res.status === 200){
        setEvent(res?.data?.event);
     }   
    }
    catch(err:any){
      console.log(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    if(id && (!event ||Object.keys(event)?.length === 0) ) {
      handleGetSingleEvent(id)
    }
  },[event, id]);

  useEffect(() => {
    const getUser = async() => {
       const userData = await AsyncStorage.getItem("user");
       const user = userData ? JSON.parse(userData) : null;
       setUser(user);
       const attending = event?.interestedCandidate?.some((u: any) => u?._id === user?._id);
       setIsAttending(attending);
    };

    getUser();
  },[event]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />
      {/* Banner */}
      <View>
        <Image source={{ uri: event?.coverImage?.[0] }} style={styles.banner} />
        <LinearGradient colors={['transparent', Colors.white]} style={styles.bannerOverlay} />
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <ArrowLeft color={Colors.white} size={22} />
          </TouchableOpacity>
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.circleBtn}>
              <Share2 color={Colors.white} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} onPress={() => setIsSaved(!isSaved)}>
              <Bookmark color={isSaved ? Colors.warning : Colors.white} fill={isSaved ? Colors.warning : 'transparent'} size={20} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bannerBadge}>
          <Tag color={Colors.white} size={12} />
          <Text style={styles.bannerBadgeText}>{event?.category}</Text>
        </View>
        <View style={[styles.priceBadge, event?.isFree && styles.freeBadge]}>
          <Text style={styles.priceBadgeText}>{event?.price}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.eventTitle}>{event?.title}</Text>

        {/* Key details */}
        <View style={styles.detailsCard}>
          {[
            { icon: Calendar, text: eventDate, color: Colors.primary },
            { icon: Clock, text: eventTime, color: Colors.secondary },
            { icon: MapPin, text: event?.location, color: Colors.accent },
          ].map(({ icon: Icon, text, color }, i) => (
            <View key={i} style={[styles.detailRow, i < 2 && styles.detailRowBorder]}>
              <View style={[styles.detailIconWrap, { backgroundColor: color + '20' }]}>
                <Icon color={color} size={18} />
              </View>
              <Text style={styles.detailText}>{text}</Text>
              <ChevronRight color={Colors.gray600} size={16} />
            </View>
          ))}
        </View>

        {/* Organizer */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizer</Text>
          <View style={styles.organizerCard}>
            <Avatar uri={event?.organizer?.avatar} size={52} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.organizerName}>{event?.organizer?.name}</Text>
              <Text style={styles.organizerUsername}>{event?.organizer?.username}</Text>
            </View>
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
          </View>
        </View> */}

        {/* Stats */}
        <View style={styles.statsRow}>
          {/* <View style={styles.statCard}>
            <Text style={styles.statNum}>{formatCount(event?.interested)}</Text>
            <Text style={styles.statLabel}>Interested</Text>
          </View> */}
          <View style={[styles.statCard, { borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '10' }]}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>{event?.interestedCandidate?.length}</Text>
            <Text style={styles.statLabel}>Attending</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{event?.description}</Text>
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who's Going</Text>
          <View style={styles.participantsRow}>
            {event?.interestedCandidate?.slice(0, 5).map((u:any, i:number) => (
              <View key={u?._id} style={[styles.participantAvatar, { marginLeft: i > 0 ? -14 : 0 }]}>
                <Avatar uri={u?.profileImage} size={40} />
              </View>
            ))}
            <View style={styles.moreParticipants}>
              <Text style={styles.moreParticipantsText}>+{event?.interestedCandidate?.length}</Text>
            </View>
          </View>
        </View>

        {/* Location placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapPlaceholder}>
            <MapPin color={Colors.primary} size={28} />
            <Text style={styles.mapPlaceholderText}>{event?.location}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionBtns}>
          {/* <TouchableOpacity
            style={[styles.interestedBtn, isInterested && styles.interestedBtnActive]}
            onPress={() => setIsInterested(!isInterested)}
          >
            <Star
              color={isInterested ? Colors.warning : Colors.gray400}
              fill={isInterested ? Colors.warning : 'transparent'}
              size={18}
            />
            <Text style={[styles.interestedBtnText, isInterested && { color: Colors.warning }]}>
              {isInterested ? 'Interested' : 'Interested?'}
            </Text>
          </TouchableOpacity> */}
     <TouchableOpacity
  onPress={() => handleinterestedOrNotInterestedFromEvent(event?._id)}
  disabled={isPast || loading}
  style={{ flex: 1, opacity: isPast || loading ? 0.6 : 1 }}
>
  <LinearGradient
    colors={(isPast ? Colors.gradients.accent : isAttending ? Colors.gradients.accent : Colors.gradients.primary) as [string, string]}
    style={{
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    }}
  >
    <Text style={{ color: "#fff", fontWeight: "600" }}>
      {loading
        ? <ActivityIndicator color={"white"} />
        : isPast
          ? "Ended"
          : isAttending
            ? "Attending"
            : "Attend Event"}
    </Text>
  </LinearGradient>
</TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  banner: { width: '100%', height: 280, resizeMode: 'cover' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: { flexDirection: 'row', gap: 10 },
  bannerBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerBadgeText: { color: Colors.white, fontSize: Typography.fontSizes.xs },
  priceBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  freeBadge: { backgroundColor: Colors.success },
  priceBadgeText: { color: Colors.white, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.bold },
  content: { padding: 16, gap: 0 },
  eventTitle: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.bold,
    lineHeight: 32,
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.gray200 },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    flex: 1,
    color: Colors.gray700,
    fontSize: Typography.fontSizes.base,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 12,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  organizerName: { color: Colors.gray900, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold },
  organizerUsername: { color: Colors.gray500, fontSize: Typography.fontSizes.sm, marginTop: 2 },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followBtnText: { color: Colors.primary, fontSize: Typography.fontSizes.sm, fontWeight: Typography.fontWeights.semibold },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  statNum: { color: Colors.primary, fontSize: Typography.fontSizes.xl, fontWeight: Typography.fontWeights.bold },
  statLabel: { color: Colors.gray500, fontSize: Typography.fontSizes.sm, marginTop: 4 },
  description: { color: Colors.gray700, fontSize: Typography.fontSizes.base, lineHeight: 24 },
  participantsRow: { flexDirection: 'row', alignItems: 'center' },
  participantAvatar: { borderWidth: 2, borderColor: Colors.white, borderRadius: 22 },
  moreParticipants: {
    marginLeft: -14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreParticipantsText: { color: Colors.gray700, fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semibold },
  mapPlaceholder: {
    height: 140,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPlaceholderText: { color: Colors.gray600, fontSize: Typography.fontSizes.base, textAlign: 'center' },
  actionBtns: { flexDirection: 'row', gap: 12, paddingTop: 8, paddingBottom: 32 },
  interestedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    paddingVertical: 13,
  },
  interestedBtnActive: { borderColor: Colors.warning, backgroundColor: Colors.warning + '15' },
  interestedBtnText: { color: Colors.gray600, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.medium },
});
