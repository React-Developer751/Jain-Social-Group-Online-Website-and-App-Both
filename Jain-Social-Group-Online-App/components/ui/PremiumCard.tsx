import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Zap, Check } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import PaymentDialog from "../forms/PaymentDialog";

interface Props {
  onUpgrade?: () => void;
}

export default function PremiumCard({ onUpgrade }: Props) {
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const isIOS = Platform.OS === 'ios';

  const benefits = ['Unlimited posts', 'Verified badge', 'Ad-free experience'];

  return (
    <>
    <PaymentDialog visible={openDialog} setVisible={setOpenDialog} />
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#0F3460']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.accentBar} />
      <View style={styles.top}>
        <View style={styles.crownWrap}>
          <LinearGradient
            colors={Colors.gradients.premium as [string, string]}
            style={styles.crownBg}
          >
            <Crown color={Colors.white} size={20} />
          </LinearGradient>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>Unlock all features</Text>
        </View>
        <TouchableOpacity style={styles.upgBtn} disabled={isIOS} onPress={() => {setOpenDialog(true)}} activeOpacity={0.85} >
          <LinearGradient
            colors={Colors.gradients.premium as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgBtnGrad}
          >
            <Zap color={Colors.white} size={14} />
            <Text style={styles.upgBtnText}>Upgrade</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <View style={styles.benefits}>
        {benefits.map((b, i) => (
          <View key={i} style={styles.benefitRow}>
            <Check color={Colors.warning} size={14} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </View>
      {isIOS && (
  <Text style={styles.iosMessage}>
    Premium purchases are not available on iOS. Please contact the admin to upgrade your account.
  </Text>
)}

    </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius['2xl'],
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  iosMessage: {
  marginTop: 12,
  color: Colors.gray300,
  fontSize: Typography.fontSizes.xs,
  textAlign: 'center',
},

  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.warning,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  crownWrap: {},
  crownBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  subtitle: {
    color: Colors.gray400,
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  upgBtn: { marginLeft: 8 },
  upgBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  upgBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  benefits: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benefitText: {
    color: Colors.gray300,
    fontSize: Typography.fontSizes.xs,
  },
});
