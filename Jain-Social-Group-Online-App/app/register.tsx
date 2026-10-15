import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar, MapPin,Check, Users, Briefcase, ArrowLeft } from 'lucide-react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import GradientButton from '@/components/ui/GradientButton';
import { useApp } from '@/context/AppContext';
import {Alert} from "react-native";
import { registerUser } from "@/service/auth";


export default function RegisterScreen() {
  const { setAuthenticated } = useApp();

  const [currentStep, setCurrentStep] = useState(1);

  const [form, setForm] = useState({
    fullName: "", dob: "", gender: "", email: "", mobile: "", occupation: "",
    address: "", city: "", state: "", maritalStatus: "", password: "", confirmPassword: "",
    spouseName: "", spouseDob: "", spouseEmail: "", spouseMobile: "", spouseOccupation: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openTerms = () => {
  router.push("/termsAndConditionsScreen");
};

  const update = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validateStep = () => {
    const e: Record<string, string> = {};

    /**
     * App Store Guideline 5.1.1(v): only information the app actually needs may
     * be required. Address, marital status, city, state, occupation, date of
     * birth and gender are optional — an account is created without them.
     */
    if (currentStep === 1) {
      if (!form.fullName) e.fullName = 'Full name is required';

      // Email is the account's identity, so it is required. Mobile is
      // optional, and is shown in the member directory when given.
      if (!form.email) {
        e.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        e.email = 'Enter a valid email address';
      }

      if (form.mobile && !/^(\+?91[-\s]?)?[6-9]\d{9}$/.test(form.mobile.trim())) {
        e.mobile = 'Enter a valid 10 digit mobile number';
      }
    }
    else if (currentStep === 2) {
      // The server requires 8 characters with a letter and a digit; matching
      // that here means the member is told before the request is sent.
      if (form.password.length < 8) {
        e.password = 'Password must be at least 8 characters';
      } else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        e.password = 'Password must contain a letter and a number';
      }
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    else if (currentStep === 3) {
      // App Store Guideline 1.2 — the EULA must be accepted before the
      // account is created.
      if (!acceptedTerms) e.terms = 'Please accept the Terms of Use (EULA) to create your account';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleRegister = async() => {
    if (!validateStep()) return;
    try{
       setLoading(true);
       const res = await registerUser({ ...form, termsAccepted: true });
       if (res.status === 201) {
               Alert.alert("Registration Successful", res?.data?.message || "Your account has been created successfully.");
                setAuthenticated(true);
                router.replace('/login');
            };
    }
    catch(err:any){
      console.log(err?.response?.data?.message || err?.message || "Registration failed");
      Alert.alert("Registration Failed", err?.response?.data?.message || err?.message || "Registration failed");
    }finally{ 
      setLoading(false);
    }
  };

  // Step 1 Fields (6)
  const step1Fields = [
    { key: 'fullName', label: 'Full Name', icon: User, placeholder: 'Enter your full name', type: 'default' },
    { key: 'dob', label: 'Date of Birth', icon: Calendar, placeholder: 'DD/MM/YYYY', type: 'default' },
    { key: 'gender', label: 'Gender', icon: Users, placeholder: 'Male / Female / Other', type: 'default' },
    { key: 'email', label: 'Email Address', icon: Mail, placeholder: 'your@email.com', type: 'email-address' },
    { key: 'mobile', label: 'Mobile Number', icon: Phone, placeholder: 'Enter mobile number', type: 'phone-pad' },
    { key: 'occupation', label: 'Occupation', icon: Briefcase, placeholder: 'What do you do?', type: 'default' },
  ];

  // Step 2 Fields (6)
  // All optional — see App Store Guideline 5.1.1(v)
  const step2Fields = [
    { key: 'address', label: 'Full Address (Optional)', icon: MapPin, placeholder: 'House no, Street, Area', type: 'default' },
    { key: 'city', label: 'City (Optional)', icon: MapPin, placeholder: 'Enter your city', type: 'default' },
    { key: 'state', label: 'State (Optional)', icon: MapPin, placeholder: 'Enter your state', type: 'default' },
    { key: 'maritalStatus', label: 'Marital Status (Optional)', icon: Users, placeholder: 'Single / Married / Divorced', type: 'default' },
  ];

  // Step 3 Fields (5)
  const step3Fields = [
    { key: 'spouseName', label: 'Spouse Full Name', icon: User, placeholder: 'Enter spouse name', type: 'default' },
    { key: 'spouseDob', label: 'Spouse Date of Birth', icon: Calendar, placeholder: 'DD/MM/YYYY', type: 'default' },
    { key: 'spouseEmail', label: 'Spouse Email', icon: Mail, placeholder: 'spouse@email.com', type: 'email-address' },
    { key: 'spouseMobile', label: 'Spouse Mobile', icon: Phone, placeholder: 'Enter mobile number', type: 'phone-pad' },
    { key: 'spouseOccupation', label: 'Spouse Occupation', icon: Briefcase, placeholder: 'Spouse occupation', type: 'default' },
  ];

  
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#FFFFFF']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>

          {/* Header - Club Connect Title */}
          <View style={styles.header}>
            <Text style={styles.clubTitle}>Jain Social Group Online App</Text>
            <Text style={styles.subtitle}>Step {currentStep} of 3 • Create Account</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            {[1, 2, 3].map((step) => (
              <View key={step} style={styles.progressBar}>
                <View style={[styles.progressDot, currentStep >= step && styles.progressDotActive]} />
                {step < 3 && <View style={[styles.progressLine, currentStep > step && styles.progressLineActive]} />}
              </View>
            ))}
          </View>

          {/* Form Content */}
          <View style={styles.form}>
            {/* Step 1 */}
            {currentStep === 1 && (
              <>
                <Text style={styles.stepTitle}>Personal Information</Text>
                {step1Fields.map(f => (
                  <View key={f.key} style={styles.fieldContainer}>
                    <Text style={styles.inputLabel}>{f.label}{["dob", "gender", "occupation", "mobile"].includes(f.key) && " (Optional)"}</Text>
                    <View style={[styles.inputWrap, errors[f.key] && styles.inputError]}>
                      <f.icon color={errors[f.key] ? Colors.error : "#6B7280"} size={18} />
                      <TextInput
                        style={styles.input}
                        placeholder={f.placeholder}
                        placeholderTextColor="#6B7280"
                        value={(form as any)[f.key]}
                        onChangeText={v => update(f.key, v)}
                        keyboardType={f.type as any}
                        autoCapitalize="none"
                      />
                    </View>
                    {errors[f.key] ? <Text style={styles.fieldError}>{errors[f.key]}</Text> : null}
                  </View>
                ))}
              </>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <>
                <Text style={styles.stepTitle}>Address & Security</Text>
                <Text style={styles.stepNote}>
                  Address and marital status are optional — you can leave them empty.
                </Text>
                {step2Fields.map(f => (
                  <View key={f.key} style={styles.fieldContainer}>
                    <Text style={styles.inputLabel}>{f.label}</Text>
                    <View style={[styles.inputWrap, errors[f.key] && styles.inputError]}>
                      <f.icon color={errors[f.key] ? Colors.error : Colors.gray500} size={18} />
                      <TextInput
                        style={styles.input}
                        placeholder={f.placeholder}
                       placeholderTextColor="#6B7280"
                        value={(form as any)[f.key]}
                        onChangeText={v => update(f.key, v)}
                        keyboardType={f.type as any}
                        autoCapitalize="none"
                      />
                    </View>
                    {errors[f.key] ? <Text style={styles.fieldError}>{errors[f.key]}</Text> : null}
                  </View>
                ))}

                {/* Password Fields with Labels */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                    <Lock color={errors.password ? Colors.error : Colors.gray500} size={18} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Create strong password"
                    placeholderTextColor="#6B7280"
                      value={form.password}
                      onChangeText={v => update('password', v)}
                      secureTextEntry={!showPass}
                    />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff color="#6B7280" size={18} /> : <Eye color="#6B7280" size={18} />}
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={[styles.inputWrap, errors.confirmPassword && styles.inputError]}>
                    <Lock color={errors.confirmPassword ? Colors.error : Colors.gray500} size={18} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Confirm your password"
                      placeholderTextColor="#6B7280"
                      value={form.confirmPassword}
                      onChangeText={v => update('confirmPassword', v)}
                      secureTextEntry={!showConfirm}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff color="#6B7280" size={18} /> : <Eye color="#6B7280" size={18} />}
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
                </View>
              </>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <>
                <Text style={styles.stepTitle}>Spouse Information (Optional)</Text>
                {step3Fields.map(f => (
                  <View key={f.key} style={styles.fieldContainer}>
                    <Text style={styles.inputLabel}>{f.label}</Text>
                    <View style={styles.inputWrap}>
                      <f.icon color="#6B7280" size={18} />
                      <TextInput
                        style={styles.input}
                        placeholder={f.placeholder}
                       placeholderTextColor="#6B7280"
                        value={(form as any)[f.key]}
                        onChangeText={v => update(f.key, v)}
                        keyboardType={f.type as any}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                ))}
              </>
            )}
            {/* Terms & Conditions Checkbox */}
{currentStep === 3 && (
  <View style={styles.termsRow}>

    <TouchableOpacity
      style={[
        styles.checkbox,
        acceptedTerms && styles.checkboxActive
      ]}
      onPress={() => setAcceptedTerms(!acceptedTerms)}
      activeOpacity={0.8}
    >
      {acceptedTerms && (
        <Check 
          size={16}
          color="#FFFFFF"
          strokeWidth={3}
        />
      )}
    </TouchableOpacity>


    <Text style={styles.termsText}>
      I have read and agree to the{' '}
      <Text
        style={styles.termsLink}
        onPress={openTerms}
      >
        Terms of Use (EULA) & Community Guidelines
      </Text>
      . There is no tolerance for objectionable content or abusive users.
    </Text>

  </View>
)}

{currentStep === 3 && errors.terms ? (
  <Text style={[styles.fieldError, { marginTop: -8 }]}>{errors.terms}</Text>
) : null}
            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.prevButton} onPress={handlePrevious}>
                  <Text style={styles.prevButtonText}>Previous</Text>
                </TouchableOpacity>
              )}

              {currentStep < 3 ? (
                <GradientButton
                  label="Next Step"
                  onPress={handleNext}
                  size="lg"
                  style={{ flex: 1 }}
                />
              ) : (
                <GradientButton
                  label="Create Account"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={!acceptedTerms}
                  size="lg"
                />
              )}
            </View>
          </View>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  stepNote: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: -6,
    marginBottom: 6,
  },
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  backBtn: { padding: 16, paddingTop: 56 },
  termsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 20,
  marginBottom: 5,
  paddingHorizontal: 4,
},

checkbox: {
  width: 22,
  height: 22,
  borderRadius: 6,
  borderWidth: 1.5,
  borderColor: '#D1D5DB',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
  backgroundColor: '#FFFFFF',
},

checkboxActive: {
  backgroundColor: Colors.primary,
  borderColor: Colors.primary,
},

termsText: {
  flex: 1,
  color: '#6B7280',
  fontSize: Typography.fontSizes.sm,
  lineHeight: 20,
},

termsLink: {
  color: Colors.primary,
  fontWeight: '700',
  textDecorationLine: 'underline',
},
  header: { 
    alignItems: 'center', 
    paddingBottom: 20,
    paddingHorizontal: 24 
  },
  clubTitle: {
    color: '#111827',
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 4,
  },
  subtitle: { 
    color: '#6B7280', 
    fontSize: Typography.fontSizes.base 
  },

  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 25,
  },
  progressBar: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 12, height: 12, borderRadius: 6,
   backgroundColor: '#D1D5DB',
  },
  progressDotActive: { backgroundColor: Colors.primary },
  progressLine: {
    width: 60, height: 2,backgroundColor: '#D1D5DB',
  },
  progressLineActive: { backgroundColor: Colors.primary },

  form: { paddingHorizontal: 24, gap: 16 },

  stepTitle: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 12,
  },

  fieldContainer: {
    gap: 6,
  },
  inputLabel: {
    color: '#111827',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginLeft: 4,
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
  inputError: { borderColor: Colors.error },
  input: { 
    color: '#111827',
    fontSize: Typography.fontSizes.base, 
    flex: 1 
  },

  fieldError: {
    color: Colors.error,
    fontSize: Typography.fontSizes.xs,
    marginLeft: 4,
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
   borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevButtonText: {
    color: '#6B7280',
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },

  loginRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 30,
    marginBottom: 20 
  },
  loginText: { color: Colors.gray500, fontSize: Typography.fontSizes.base },
  loginLink: { 
    color: Colors.primary, 
    fontWeight: Typography.fontWeights.semibold 
  },
});