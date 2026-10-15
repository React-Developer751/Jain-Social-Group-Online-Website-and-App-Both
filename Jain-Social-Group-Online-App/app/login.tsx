
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, Zap, Check } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import GradientButton from '@/components/ui/GradientButton';
import { useApp } from '@/context/AppContext';
import { loginUser, googleLogin, appleLogin } from "@/service/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket, initSocket } from '@/socket/socket';
import { Alert } from 'react-native';
import { signInWithGoogle, googleSignInConfigured } from '../config/googleAuth';
import { registerForPushNotifications } from '@/components/pushNotifications/pushNotification';
import { AntDesign } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function LoginScreen() {
  const socket = getSocket();
  const { setAuthenticated } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * App Store Guideline 1.2 — the Terms of Use (EULA) must be presented and
   * accepted BEFORE a member can register or log in, and the terms state that
   * there is no tolerance for objectionable content or abusive users.
   */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAuthAvailable)
      .catch(() => setAppleAuthAvailable(false));
  }, []);

  const openTerms = () => router.push('/termsAndConditionsScreen');

  // Returns false and explains why when the member has not accepted the EULA.
  const ensureTermsAccepted = () => {
    if (acceptedTerms) return true;
    setError('Please accept the Terms of Use (EULA) to continue');
    Alert.alert(
      'Terms of Use',
      'Please read and accept the Terms of Use (EULA) before signing in. There is no tolerance for objectionable content or abusive users on this platform.',
      [
        { text: 'Read Terms', onPress: openTerms },
        { text: 'OK', style: 'cancel' },
      ]
    );
    return false;
  };

  // Members still waiting for the administrator's approval get a real message
  // instead of an error screen.
  const notifyIfPendingApproval = (res: any) => {
    if (res?.data?.pendingApproval) {
      Alert.alert(
        'Membership pending approval',
        'Your account has been created. An administrator will approve your membership shortly.'
      );
    }
  };

  const handleLoginPress = async () => {
    if (!ensureTermsAccepted()) return;
    try {
      const idToken = await signInWithGoogle(); 
         if(!idToken) {
          console.log("Google Login process was closed or token not found.");
      return; 
         }
       const res = await googleLogin(idToken, true);
       if(res.status === 200){
        notifyIfPendingApproval(res);
        await AsyncStorage.setItem("accessToken", res?.data?.accessToken);
        if (res?.data?.refreshToken) {
          await AsyncStorage.setItem("refreshToken", res?.data?.refreshToken);
        }
        await AsyncStorage.setItem("user", JSON.stringify(res?.data?.data));

       // Pass the token straight in: the socket no longer depends on the
       // AsyncStorage write having landed. Room membership is decided by the
       // server from the verified token, so there is nothing to emit.
       await initSocket(res.data.accessToken);

        /* Register for push now rather than waiting for the next launch:
           this is the first moment there is a session to attach it to. */
        void registerForPushNotifications();

        setAuthenticated(true);
        router.replace('/(tabs)');
       }
    } catch (error: any) {
      console.error("Google Login Error:", error?.response?.data?.message || error.message);
      Alert.alert("Login Failed", error?.response?.data?.message || error.message || "Kuch galat hua");
    }
  };
  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!ensureTermsAccepted()) return;
    try {
      setLoading(true);
      const res = await loginUser({ identifier: email, password, platform: "mobile" });
      if (res.status === 200) {
        await AsyncStorage.setItem("accessToken", res?.data?.accessToken);
        if (res?.data?.refreshToken) {
          await AsyncStorage.setItem("refreshToken", res?.data?.refreshToken);
        }
        await AsyncStorage.setItem("user", JSON.stringify(res?.data?.data));
        Alert.alert("Login Successful", res?.data?.message || "You have logged in successfully.");

        await initSocket(res.data.accessToken);

        /* Register for push now rather than waiting for the next launch:
           this is the first moment there is a session to attach it to. */
        void registerForPushNotifications();

        setAuthenticated(true);
        router.replace('/(tabs)');
        setError('');
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      console.log('Login error:', err?.response?.data?.message || err?.message);
      Alert.alert("Login Failed", err.response?.data?.message || err?.message || 'Login failed');
      setError('');
    }
    finally {
      setLoading(false);
    }
  };

const handleAppleLogin = async () => {
  if (!ensureTermsAccepted()) return;
  try {
    if (!(await AppleAuthentication.isAvailableAsync())) {
      Alert.alert('Not available', 'Sign in with Apple is not available on this device.');
      return;
    }

    // 1. Apple Sign-In Prompt open karein
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      Alert.alert('Sign in failed', 'Apple did not return an identity token. Please try again.');
      return;
    }

    // 2. Data object taiyar karein backend ke liye
    /**
     * Apple sends fullName and email ONLY on the first authorisation. On every
     * later sign-in these are null, which is expected — the server matches the
     * account on the Apple user id inside identityToken.
     */
    /* Send a field only when Apple actually gave it. Sending `null` is what
       broke every sign-in after the first: the server accepts these as
       optional, meaning absent, and rejects a null outright. Apple returns the
       name and email on the very first authorisation only, so the app sent
       nulls from the second time onwards and was told "some of the details you
       sent are not valid" forever after. */
    const loginPayload: Record<string, unknown> = {
      identityToken: credential.identityToken,
      termsAccepted: true,
    };

    if (credential.fullName?.givenName) loginPayload.firstName = credential.fullName.givenName;
    if (credential.fullName?.familyName) loginPayload.lastName = credential.fullName.familyName;
    if (credential.email) loginPayload.email = credential.email;

    // 3. Apni appleLogin API ko call karein
    const res = await appleLogin(loginPayload);

    if (res.status === 200) {
      notifyIfPendingApproval(res);
      
      // 4. Tokens aur User data ko AsyncStorage me save karein
      await AsyncStorage.setItem("accessToken", res?.data?.accessToken);
      if (res?.data?.refreshToken) {
        await AsyncStorage.setItem("refreshToken", res?.data?.refreshToken);
      }
      await AsyncStorage.setItem("user", JSON.stringify(res?.data?.data));

     await initSocket(res.data.accessToken);

      // 6. State update karein aur Home Screen par navigate karein
      void registerForPushNotifications();

      setAuthenticated(true);
      router.replace('/(tabs)');
    }

  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      console.log("User ne login cancel kar diya");
    } else {
      console.error("Apple Login Error:", error?.response?.data?.message || error.message);
      Alert.alert( "Login Failed", error?.response?.data?.message || error.message || "Apple login ke dauran kuch galat hua" );
    }
  }
};

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={Colors.gradients.cool as [string, string]}
              style={styles.logoBg}
            >
              <Zap color={Colors.white} size={28} fill={Colors.white} />
            </LinearGradient>
            <Text style={styles.appName}>jain social group online</Text>
            <Text style={styles.subtitle}>Welcome back!</Text>
            <Text style={styles.subtext}>Sign in to continue your journey</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.inputWrap}>
              <Mail color={"#6B7280"} size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email or mobile number"
                placeholderTextColor={"#6B7280"}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrap}>
              <Lock color={"#6B7280"} size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={"#6B7280"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
                {showPass ? (
                  <EyeOff color={"#6B7280"} size={18} />
                ) : (
                  <Eye color={"#6B7280"} size={18} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => {router.push("/forgetPassword")}}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Terms of Use (EULA) — App Store Guideline 1.2.
                Shown before registering or logging in; every sign-in method
                below is blocked until it is accepted. */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}
                onPress={() => {
                  setAcceptedTerms(!acceptedTerms);
                  if (!acceptedTerms) setError('');
                }}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedTerms }}
              >
                {acceptedTerms && <Check size={15} color="#FFFFFF" strokeWidth={3} />}
              </TouchableOpacity>

              <Text style={styles.termsText}>
                I have read and agree to the{' '}
                <Text style={styles.termsLink} onPress={openTerms}>
                  Terms of Use (EULA) & Community Guidelines
                </Text>
                . There is no tolerance for objectionable content or abusive users.
              </Text>
            </View>

            <GradientButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={{ marginTop: 8, opacity: acceptedTerms ? 1 : 0.5 }}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
        {Platform.OS === 'ios' ? (
  <View style={styles.socialColumn}>
    {/* Only offered when this build actually carries a Google client id. */}
    {googleSignInConfigured && (
    <TouchableOpacity
      style={styles.socialBtnAndroid}
      onPress={handleLoginPress}
      activeOpacity={0.7}
    >
      <AntDesign name="google" size={20} color="#DB4437" style={styles.googleIconAndroid} />
      <Text style={styles.socialTextAndroid}>Sign in with Google</Text>
    </TouchableOpacity>
    )}

    {/* Apple's own button — Sign in with Apple must use it (App Store HIG) */}
    {appleAuthAvailable && (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={styles.appleBtn}
        onPress={handleAppleLogin}
      />
    )}
  </View>
) : (
  <View style={styles.socialRow}>
    {googleSignInConfigured && (
    <TouchableOpacity 
      style={styles.socialBtnAndroid} 
      onPress={handleLoginPress}
      activeOpacity={0.7}
    >
      <AntDesign name="google" size={20} color="#DB4437" style={styles.googleIconAndroid} />
      <Text style={styles.socialTextAndroid}>Sign in with Google</Text>
    </TouchableOpacity>
    )}
  </View>
)}

          </View>

          {/* Register */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 32,
  },
  logoBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    color: '#111827',
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    color: '#111827',
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 4,
  },
  subtext: {
    color: '#6B7280',
    fontSize: Typography.fontSizes.base,
  },
  form: {
    paddingHorizontal: 24,
    gap: 14,
  },
  error: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  inputIcon: {},
  input: {
    color: '#111827',
    fontSize: Typography.fontSizes.base,
    flex: 1,
  },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#6B7280',
    fontSize: Typography.fontSizes.sm,
  },
 termsRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
  marginTop: 4,
},
checkbox: {
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 1.5,
  borderColor: '#9CA3AF',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFFFFF',
  marginTop: 1,
},
checkboxActive: {
  backgroundColor: Colors.primary,
  borderColor: Colors.primary,
},
termsText: {
  flex: 1,
  color: '#4B5563',
  fontSize: Typography.fontSizes.sm,
  lineHeight: 19,
},
termsLink: {
  color: Colors.primary,
  fontWeight: Typography.fontWeights.semibold,
  textDecorationLine: 'underline',
},
socialColumn: {
  gap: 12,
  marginVertical: 12,
  width: '100%',
},
appleBtn: {
  width: '100%',
  height: 48,
},
 socialRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 20, 
  width: '100%', // Android button stretching ke liye zaroori hai
  paddingHorizontal: 20,
},
socialBtn: {
  width: 52,
  height: 52,
  borderRadius: 16,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  alignItems: 'center',
  justifyContent: 'center',
  marginHorizontal: 8, 
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2, 
},
// Naya Android Premium Google Button Style
socialBtnAndroid: {
  flexDirection: 'row', 
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 12, // Google branding guidelines ke hisab se clean look
  height: 48,
  width: '100%', // Pura space cover karne ke liye
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
},
googleIconAndroid: {
  marginRight: 12, // Icon aur text ke beech ka premium gap
},
socialTextAndroid: {
  color: '#1F2937', // Dark Greyish Black premium tone
  fontSize: 15,
  fontWeight: '600', // Semi-bold standard font weight
  fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
},

  socialIcon: {
    color: '#111827',
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: { color: '#6B7280', fontSize: Typography.fontSizes.base },
  registerLink: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
});
