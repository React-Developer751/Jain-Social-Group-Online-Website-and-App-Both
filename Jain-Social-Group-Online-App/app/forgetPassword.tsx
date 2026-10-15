import React, { useState, useEffect } from "react";
import {  StyleSheet,  Text,  View,  TextInput,Alert,  TouchableOpacity,  SafeAreaView,  ActivityIndicator, DeviceEventEmitter} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Timer } from "lucide-react-native"; // Note: Use lucide-react-native
import { forgetPassword } from "@/service/password";
import { Colors } from "@/constants/theme";


export default function ForgetPassword() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSent, setIsSent] = useState(false); 
    const [timeLeft, setTimeLeft] = useState(600); 

    // --- CONVERTED LOGIC: Listen for success signal across the native app ---
    useEffect(() => {
        if (!isSent) return;

        // Using native DeviceEventEmitter instead of web BroadcastChannel
        const subscription = DeviceEventEmitter.addListener('PASSWORD_RESET_SUCCESS', (data) => {
           Alert.alert("Password Updated Successfully.", "We detected your password change. Redirecting...")
        
            
            // Immediately take the user to login screen
            router.replace("/login");
            router.replace("/newPassword")
        });

        return () => {
            subscription.remove(); // Clean up native listener
        };
    }, [isSent, router]);

    // Countdown and auto-redirect logic
    useEffect(() => {
        if (!isSent) return;

        if (timeLeft <= 0) {
            router.replace("/login"); 
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isSent, timeLeft, router]);

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const handleSubmit = async () => {
        if (!identifier) {
            Alert.alert("Email or Mobile Number is Required", "Please enter your email or phone number to receive the reset link.")
        }
        setLoading(true);
        try {
            const res = await forgetPassword(identifier);
            if (res.status === 200) {
                setIsSent(true); 
                Alert.alert("Link Sent Successfully", res?.data?.message || "Password reset link sent successfully")
            }
        } catch (err: any) {
            console.log(err);
            Alert.alert("Reset Link Sent Failed.", err.response?.data?.message || "Failed to send reset link")
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* --- BACK BUTTON --- */}
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.push("/")}
            >
                <ArrowLeft size={16} color={Colors.gray500} />
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            {!isSent ? (
                /* --- FORGOT PASSWORD FORM --- */
                <View style={styles.card}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.title}>Forgot Password</Text>
                        <Text style={styles.subtitle}>
                            Enter your email or phone and we'll send you a link to reset your password.
                        </Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Email or Phone</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter email or phone"
                            placeholderTextColor="#9ca3af"
                            value={identifier}
                            onChangeText={(text) => setIdentifier(text)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.primaryButton, loading && styles.disabledButton]} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.textButton} 
                        onPress={() => router.push("/login")}
                    >
                        <Text style={styles.linkText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* --- MINI SUCCESS POPUP CARD --- */
                <View style={[styles.card, styles.successCard]}>
                    <View style={styles.iconContainer}>
                        <CheckCircle2 size={64} color={Colors.success} />
                    </View>

                    <Text style={styles.title}>Check Your Inbox</Text>
                    
                    <Text style={styles.successDescription}>
                        A secure password reset link has been dispatched to your account credentials. Please click the link inside your email message to complete verification.
                    </Text>

                    <View style={styles.alertBox}>
                        <Timer size={16} color={Colors.warning} style={{ marginRight: 8 }} />
                        <Text style={styles.alertText}>
                            Waiting for you to complete password update...
                        </Text>
                    </View>

                    <Text style={styles.timerText}>
                        Link expires automatically in <Text style={styles.timerCountdown}>{formatTime(timeLeft)}</Text>
                    </Text>

                    <View style={styles.footerBorder}>
                        <TouchableOpacity 
                            style={styles.textButton} 
                            onPress={() => router.push("/login")}
                        >
                            <Text style={styles.linkText}>Return to Login Page</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        elevation: 3, // Android shadow
        borderWidth: 1,
        borderColor: Colors.gray100,
    },
    successCard: {
        maxWidth: 360,
        borderColor: Colors.accentLight,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 32,
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
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.gray700,
        marginBottom: 8,
    },
    input: {
        height: 44,
        width: '100%',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.gray300,
        paddingHorizontal: 12,
        fontSize: 14,
        color: Colors.gray900,
        backgroundColor: Colors.white,
    },
    primaryButton: {
        height: 44,
        backgroundColor: Colors.primary,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    successDescription: {
        fontSize: 14,
        color: Colors.gray600,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    alertBox: {
        backgroundColor: '#fffbeb',
        borderColor: '#fef3c7',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    alertText: {
        fontSize: 12,
        color: '#92400e',
        fontWeight: '500',
    },
    timerText: {
        fontSize: 12,
        color: Colors.gray400,
        textAlign: 'center',
        marginBottom: 16,
    },
    timerCountdown: {
        fontWeight: '600',
        color: Colors.gray600,
    },
    footerBorder: {
        borderTopWidth: 1,
        borderColor: Colors.gray100,
        paddingTop: 16,
    },
});