import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

interface Props {
  uri: string;
  size?: number;
  hasStory?: boolean;
  isOnline?: boolean;
  storyViewed?: boolean;
  style?: ViewStyle;
}

export default function Avatar({
  uri,
  size = 40,
  hasStory,
  isOnline,
  storyViewed = false,
  style,
}: Props) {
  const ringSize = size + 6;

  return (
    <View style={[{ width: ringSize, height: ringSize }, style]}>
      {hasStory ? (
        <LinearGradient
          colors={
            storyViewed
              ? [Colors.gray400, Colors.gray500]
              : (Colors.gradients.story1 as [string, string])
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
        >
          <Image
            source={{ uri }}
            style={[
              styles.img,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: Colors.dark.bg,
              },
            ]}
          />
        </LinearGradient>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
        />
      )}
      {isOnline && (
        <View
          style={[
            styles.online,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    resizeMode: 'cover',
  },
  online: {
    position: 'absolute',
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.dark.bg,
  },
});
