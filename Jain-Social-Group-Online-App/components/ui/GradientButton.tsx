import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Typography } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  gradient?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function GradientButton({
  label,
  onPress,
  gradient = Colors.gradients.primary,
  style,
  textStyle,
  loading,
  disabled,
  size = 'md',
}: Props) {
  const heights = { sm: 36, md: 48, lg: 56 };
  const fontSizes = { sm: Typography.fontSizes.sm, md: Typography.fontSizes.md, lg: Typography.fontSizes.lg };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[{ opacity: disabled ? 0.5 : 1 }, style]}
    >
      <LinearGradient
        colors={gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.btn, { height: heights[size], borderRadius: BorderRadius.xl }]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={[styles.label, { fontSize: fontSizes[size] }, textStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    color: Colors.white,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0.3,
  },
});
