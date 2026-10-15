import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonItem({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.gray200,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

export function PostSkeleton() {
  return (
    <View style={styles.postCard}>
      <View style={styles.header}>
        <SkeletonItem width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
          <SkeletonItem width="60%" height={14} />
          <SkeletonItem width="40%" height={12} />
        </View>
      </View>
      <SkeletonItem width="100%" height={14} style={{ marginTop: 12 }} />
      <SkeletonItem width="80%" height={14} style={{ marginTop: 8 }} />
      <SkeletonItem width="100%" height={200} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: Colors.white,
    padding: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
