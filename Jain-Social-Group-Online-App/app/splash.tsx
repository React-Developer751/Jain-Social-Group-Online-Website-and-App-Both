import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // setTimeout(() => router.replace('/onboarding'), 600);
    });
  }, []);

  const ring1Style = {
    opacity: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  };
  const ring2Style = {
    opacity: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
    transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }],
  };

  return (
    <LinearGradient colors={['#050510', '#0A0A1F', '#050510']} style={styles.container}>
      {/* Rings */}
      <Animated.View style={[styles.ring, ring2Style]} />
      <Animated.View style={[styles.ring, ring1Style]} />

      {/* Logo */}
      <Animated.View
        style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <LinearGradient
          colors={Colors.gradients.cool as [string, string]}
          style={styles.logoBg}
        >
          <Zap color={Colors.white} size={40} fill={Colors.white} />
        </LinearGradient>
      </Animated.View>

      {/* Text */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
        <Text style={styles.appName}>Vibe</Text>
        <Text style={styles.tagline}>Connect. Share. Belong.</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
  },
  logoWrap: {
    zIndex: 10,
  },
  logoBg: {
    width: 100,
    height: 100,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: Colors.white,
    fontSize: Typography.fontSizes['4xl'],
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 4,
  },
  tagline: {
    color: Colors.gray400,
    fontSize: Typography.fontSizes.base,
    letterSpacing: 2,
    marginTop: 8,
  },
});
