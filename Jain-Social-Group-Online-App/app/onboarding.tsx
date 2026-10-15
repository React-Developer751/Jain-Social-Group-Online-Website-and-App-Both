import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated, Image} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Users, MessageCircle, Calendar } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import GradientButton from '@/components/ui/GradientButton';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: Users,
    color: Colors.gradients.cool,
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=400&h=500&fit=crop',
    title: 'Connect with Friends',
    subtitle: 'Find and connect with people who share your passions and build meaningful relationships',
  },
  {
    id: '2',
    icon: MessageCircle,
    color: Colors.gradients.warm,
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?w=400&h=500&fit=crop',
    title: 'Share Your Story',
    subtitle: 'Post photos, videos, and moments that matter. Let the world see who you are',
  },
  {
    id: '3',
    icon: Calendar,
    color: Colors.gradients.accent,
    image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?w=400&h=500&fit=crop',
    title: 'Discover & Explore',
    subtitle: 'Join groups, attend events, and explore communities that spark your curiosity',
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      flatRef.current?.scrollToIndex({ index: next });
      setIndex(next);
    } else {
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatRef as any}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.4)', Colors.white]}
              style={styles.imgOverlay}
            />
            <View style={styles.content}>
              <LinearGradient
                colors={item.color as [string, string]}
                style={styles.iconBg}
              >
                <item.icon color={Colors.white} size={28} />
              </LinearGradient>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
          );
        })}
      </View>

      {/* Buttons */}
      <View style={styles.btnWrap}>
        <GradientButton
          label={index === SLIDES.length - 1 ? "Get Started" : "Next"}
          onPress={goNext}
          size="lg"
          style={{ flex: 1 }}
        />
        {index < SLIDES.length - 1 && (
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Login link */}
      <View style={styles.loginRow}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.loginLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  image: {
    width,
    height: height * 0.5,
    resizeMode: 'cover',
  },
  imgOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 24,
    alignItems: 'center',
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: Colors.black,
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  btnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  skipText: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 24,
  },
  loginText: {
    color: Colors.gray600,
    fontSize: Typography.fontSizes.base,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
});
