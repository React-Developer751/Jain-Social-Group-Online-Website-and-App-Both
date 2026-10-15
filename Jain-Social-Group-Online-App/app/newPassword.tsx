import React, { useState } from "react";
import { 
    StyleSheet, 
    Text, 
    View, 
    Alert,
    TextInput, 
    TouchableOpacity, 
    SafeAreaView, 
    ActivityIndicator,
    DeviceEventEmitter 
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react-native"; // Note: Use lucide-react-native
import { updatePassword } from "../service/password";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";

// Mocking useToast behavior for React Native. 
// Replace this with your actual custom mobile toast hook if you use one (e.g., react-native-toast-message)


export default function NewPassword() {
    
    // Extracts the token parameter from the deep link URL (e.g., exp://.../new-password?token=xyz)
    const { token } = useLocalSearchParams<{ token: string }>();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const handleSubmit = async () => {
        console.log("click button.....")
        if (!password || !confirmPassword) {
           return Alert.alert("Fields Required", "Please fill out both password input fields.");
           
        }

        // Matches the server rule, so the member is told before the request goes.
        if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
           return Alert.alert("Weak Password","Password must be at least 8 characters and contain a letter and a number.")
         
        }

        if (password !== confirmPassword) {
           return Alert.alert("Passwords Mismatch", "The confirmation password does not match your new password.") 
        }

        setLoading(true);
        try {
            // Explicitly handling string vs array type from search params safety fallback
            const finalToken = Array.isArray(token) ? token[0] : token;

            console.log("Token from URL:", token);
console.log("Final Token:", finalToken);
            const res = await updatePassword(finalToken || "", password);
            
            if (res.status === 200) {
                Alert.alert("New Password Set Successfully", res?.data?.message || "Your password has been updated successfully.") 
        
                // --- 1. BROADCAST SIGNAL NATIVELY: Notify listening background screens ---
                DeviceEventEmitter.emit('PASSWORD_RESET_SUCCESS');

                // --- 2. MOBILE FALLBACK ROUTING ---
                setTimeout(() => {
                    // Navigate securely out of the workflow 
                    router.replace("/login"); 
                }, 1000);
            }
        } catch (err: any) {
            console.log(err);
         return Alert.alert("Reset Failed", err.response?.data?.message || "Failed to update password. Link might be invalid or expired.") 
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- BACK TO LOGIN --- */}
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.push("/login")}
            >
                <ArrowLeft size={16} color={Colors.gray500} />
                <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>

            <View style={styles.card}>
                
                {/* --- HEADER --- */}
                <View style={styles.headerContainer}>
                    <View style={styles.iconCircle}>
                        <Lock size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Set New Password</Text>
                    <Text style={styles.subtitle}>
                        Please choose a strong, secure password that you don't use elsewhere.
                    </Text>
                </View>

                {/* --- NEW PASSWORD INPUT --- */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!showPass}
                            value={password}
                            onChangeText={(text) => setPassword(text)}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPass(!showPass)}
                        >
                            {showPass ? <EyeOff size={16} color={Colors.gray400} /> : <Eye size={16} color={Colors.gray400} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- CONFIRM PASSWORD INPUT --- */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#9ca3af"
                            secureTextEntry={!showConfirmPass}
                            value={confirmPassword}
                            onChangeText={(text) => setConfirmPassword(text)}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowConfirmPass(!showConfirmPass)}
                        >
                            {showConfirmPass ? <EyeOff size={16} color={Colors.gray400} /> : <Eye size={16} color={Colors.gray400} />}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- SUBMIT BUTTON --- */}
                <TouchableOpacity 
                    style={[styles.primaryButton, loading && styles.disabledButton]} 
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Reset Password</Text>
                    )}
                </TouchableOpacity>

                {/* --- BOTTOM REDIRECT --- */}
                <TouchableOpacity 
                    style={styles.textButton} 
                    onPress={() => router.push("/login")}
                >
                    <Text style={styles.linkText}>Return to Login</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    backButton: {
        position: 'absolute',
        top: 48,
        left: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.gray600,
        marginLeft: 8,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: Colors.white,
        padding: 32,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircle: {
        width: 48,
        height: 48,
        backgroundColor: Colors.primaryLight,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.gray900,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.gray500,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    formGroup: {
        flexDirection: 'column',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.gray700,
        marginBottom: 6,
    },
    inputContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        height: 44,
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.gray300,
        paddingLeft: 12,
        paddingRight: 40,
        fontSize: 14,
        color: Colors.gray900,
        backgroundColor: Colors.white,
    },
    eyeButton: {
        position: 'absolute',
        right: 12,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButton: {
        height: 44,
        backgroundColor: Colors.primary,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    disabledButton: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '500',
    },
    textButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
    },
});