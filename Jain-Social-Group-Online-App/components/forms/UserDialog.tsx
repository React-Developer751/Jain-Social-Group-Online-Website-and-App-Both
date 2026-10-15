import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, Plus, Trash2, Camera, Upload, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import GradientButton from '@/components/ui/GradientButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSingleUser, updateUser } from '@/service/auth';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { setUserData } from '@/redux-toolkit/slice/userSlice';
import { useAppDispatch } from '@/redux-toolkit/customHook/hook';

export default function UserProfileScreen() {
    const dispatch = useAppDispatch();
    const [user, setUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showBusiness, setShowBusiness] = useState(false);
    const [accountType, setAccountType] = useState("user");

    const [formData, setFormData] = useState<any>({
        userId: user?._id,
        accountType: "user",
        type: "public",
        businesses: [],
        children: [],
    });

    const [preview, setPreview] = useState<any>({
        profileImage: null,
        coverImage: null,
        businessCoverImages: {} as Record<number, string>,
    });

    useEffect(() => {
        const getUser = async () => {
            const res = await AsyncStorage.getItem("user");
            const parsed = res ? JSON.parse(res) : null;
            setUser(parsed);
        };
        if (user === null) {
            getUser();
        };
    }, [user]);

    // Handle Input Change
    const handleChange = (name: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    // Image Picker
    const pickImage = async (
        name: string,
        businessIndex?: number
    ) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {

            const asset = result.assets[0];

            if (businessIndex !== undefined) {

                const updatedBusinesses = [...formData.businesses];

                updatedBusinesses[businessIndex] = {
                    ...updatedBusinesses[businessIndex],
                    businessCoverImage: asset,
                };

                setFormData({
                    ...formData,
                    businesses: updatedBusinesses,
                });

                setPreview({
                    ...preview,
                    businessCoverImages: {
                        ...preview.businessCoverImages,
                        [businessIndex]: asset.uri,
                    },
                });

            } else {

                setFormData({
                    ...formData,
                    [name]: asset,
                });

                setPreview({
                    ...preview,
                    [name]: asset.uri,
                });
            }
        }
    };

    // Child Handlers
    const addChild = () => {
        setFormData({
            ...formData,
            children: [...(formData.children || []), { name: "", age: "" }]
        });
    };

    const handleChildChange = (index: number, field: string, value: any) => {
        const updatedChildren = [...(formData.children || [])];
        updatedChildren[index] = { ...updatedChildren[index], [field]: value };
        setFormData({ ...formData, children: updatedChildren });
    };

    const removeChild = (index: number) => {
        const updated = formData.children.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, children: updated });
    };

    // Business Handlers
    const addBusiness = () => {
        setFormData({
            ...formData,
            businesses: [
                ...(formData.businesses || []),
                {
                    businessName: "",
                    businessCategory: "",
                    website: "",
                    businessDescription: "",
                    businessPhone: "",
                    workingHours: "",
                    businessAddress: "",
                    businessCoverImage: null,
                }
            ]
        });
    };

    const removeBusiness = (index: number) => {
        const updated = formData.businesses.filter((_: any, i: number) => i !== index);
        const updatedPreviews = { ...preview.businessCoverImages };
        delete updatedPreviews[index];
        setPreview({ ...preview, businessCoverImages: updatedPreviews });
        setFormData({ ...formData, businesses: updated });
    };

    const handleBusinessChange = (index: number, field: string, value: any) => {
        const updated = [...formData.businesses];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, businesses: updated });
    };

    const handleSubmit = async () => {
        try {
            setIsLoading(true);

            const form = new FormData();

            const finalUserId = user?._id || formData?._id || formData?.userId;

            if (finalUserId) {
                form.append("userId", finalUserId);
            }

            /* A password change needs all three fields together. Sending an
               empty `password` used to reach the server and be ignored; now the
               member is told here instead. */
            const wantsPasswordChange = Boolean(formData.password?.trim());

            if (wantsPasswordChange) {
                if (!formData.currentPassword?.trim()) {
                    setIsLoading(false);
                    return Alert.alert("Current password needed", "Enter your current password to set a new one.");
                }
                if (formData.password !== formData.confirmPassword) {
                    setIsLoading(false);
                    return Alert.alert("Passwords do not match", "The new password and its confirmation are different.");
                }
                if (formData.password.length < 8 || !/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
                    setIsLoading(false);
                    return Alert.alert("Password too weak", "Use at least 8 characters with a letter and a number.");
                }
            }

            // Normal fields
            Object.keys(formData).forEach((key) => {
                const excluded = [
                    "businesses", "children", "userId", "_id", "friends", "isOnline", "lastSeen",
                    "profileImage", "coverImage",
                    /* Administrator-controlled. The server ignores these from a
                       member, so sending them only adds noise. */
                    "role", "blocked", "isVerified", "premiumUser", "accountType", "isDeleted",
                    "deleteStatus", "amount", "paymentImage", "transitionNumber",
                    /* Handled explicitly below. */
                    "password", "confirmPassword", "currentPassword"
                ];

                if (!excluded.includes(key) && formData[key] !== undefined && formData[key] !== null) {
                    form.append(key, String(formData[key]));
                }
            });

            if (wantsPasswordChange) {
                form.append("password", formData.password);
                form.append("currentPassword", formData.currentPassword);
            }

            // Profile Image
            if (formData.profileImage && typeof formData.profileImage === "object" && formData.profileImage.uri) {
                form.append("profileImage", {
                    uri: formData.profileImage.uri,
                    name: formData.profileImage.fileName || `profile-${Date.now()}.jpg`,
                    type: formData.profileImage.mimeType || "image/jpeg",
                } as any);
            }
            // Cover Image
            if (formData.coverImage && typeof formData.coverImage === "object" && formData.coverImage.uri) {
                form.append("coverImage", {
                    uri: formData.coverImage.uri,
                    name: formData.coverImage.fileName || `cover-${Date.now()}.jpg`,
                    type: formData.coverImage.mimeType || "image/jpeg",
                } as any);
            }
            // Children
            form.append("children", JSON.stringify(formData.children || []));

            // Businesses JSON
            const businessesForJSON = formData.businesses.map(
                (biz: any) => ({
                    businessName: biz.businessName,
                    businessCategory: biz.businessCategory,
                    website: biz.website,
                    businessDescription: biz.businessDescription,
                    businessPhone: biz.businessPhone,
                    workingHours: biz.workingHours,
                    businessAddress: biz.businessAddress,
                })
            );

            form.append(
                "businesses",
                JSON.stringify(businessesForJSON)
            );

            // Business Images
            formData.businesses.forEach(
                (biz: any, index: number) => {
                    if (biz.businessCoverImage && typeof biz.businessCoverImage === "object" && biz.businessCoverImage.uri) {
                        form.append(`businessCoverImage_${index}`,
                            {
                                uri: biz.businessCoverImage.uri,
                                name: biz.businessCoverImage.fileName || `business-${index}.jpg`,
                                type: biz.businessCoverImage.mimeType || "image/jpeg",
                            } as any
                        );
                    }
                }
            );

            const res = await updateUser(form);

            if (res.status === 200) {
                const updatedUser = res.data.user;

                if (updatedUser) {
                    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
                    dispatch(setUserData(updatedUser));
                }
                Alert.alert("Profile Updated Successfully", res.data.message);
                handleGetUser();
            }
        } catch (err: any) {
            console.log(err?.response?.data?.message || err?.message);
            Alert.alert("Profile Update Failed", err?.response?.data?.message || err?.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetUser = async () => {
        if (!user?._id) return;
        try {
            const res = await getSingleUser(user?._id);
            if (res.status === 200) {
                const data = res?.data?.data || {};
                setFormData({
                    ...data,
                    businesses: data.businesses?.length > 0
                        ? data.businesses
                        : [{
                            businessName: "",
                            businessCategory: "",
                            website: "",
                            businessDescription: "",
                            businessPhone: "",
                            workingHours: "",
                            businessAddress: "",
                            businessCoverImage: ""
                        }]
                });

                setAccountType(data?.accountType || "user");
                if (data.accountType === "business") setShowBusiness(true);
            }
        } catch (err: any) {
            console.log(err?.response?.data?.message || err?.message);
        }
    };

    useEffect(() => {
        handleGetUser();
    }, [user?._id]);


    return (
        <View style={styles.container}>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.headerRow}>

                    <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")}>
                        <ArrowLeft color={Colors.gray900} size={24} />
                    </TouchableOpacity>

                    <View>
                        <Text style={styles.title}>Profile Settings</Text>
                        <Text style={styles.subtitle}>
                            Update your personal and business information
                        </Text>
                    </View>

                </View>

                {/* Cover + Profile Image */}
                <View style={styles.imageSection}>
                    <View style={styles.coverContainer}>
                        <Image
                            source={{ uri: preview.coverImage || formData.coverImage || "https://imgs.search.brave.com/kw_qY89Yq9zZZHGIxcrZulLXAq5h4GmQ7LtNs1KnOVk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjIx/NDM2OTQ0Ny92ZWN0/b3IvYWJzdHJhY3Qt/YmFja2dyb3VuZC1k/ZXNpZ24tcm91Z2gt/YW5kLXNvZnQtd2F2/ZS10ZXh0dXJlLXdp/dGgtYmx1cnJlZC1w/YXN0ZWwtY29sb3Jz/LmpwZz9zPTYxMng2/MTImdz0wJms9MjAm/Yz1reW85ZmxNQVN3/c1M5eWYxR3BNRjdm/cHFFWFN5a3ZzMHhI/Zm1DRmdXVFlJPQ" }}
                            style={styles.coverImage}
                            resizeMode="cover"
                        />
                        <TouchableOpacity style={styles.changeCoverBtn} onPress={() => pickImage('coverImage')}>
                            <Upload color={Colors.white} size={18} />
                            <Text style={styles.changeCoverText}>Change Cover</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileContainer}>
                        <View style={styles.profileImageWrapper}>
                            <Image
                                source={{ uri: preview.profileImage || formData.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2" }}
                                style={styles.profileImage}
                            />
                            <TouchableOpacity style={styles.cameraBtn} onPress={() => pickImage('profileImage')}>
                                <Camera color={Colors.white} size={20} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Account Type */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Account Type</Text>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, accountType === 'user' && styles.toggleActive]}
                            onPress={() => { setAccountType('user'); handleChange('accountType', 'user'); }}
                        >
                            <Text style={[styles.toggleText, accountType === 'user' && styles.toggleActiveText]}>Personal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, accountType === 'business' && styles.toggleActive]}
                            onPress={() => { setAccountType('business'); handleChange('accountType', 'business'); setShowBusiness(true); }}
                        >
                            <Text style={[styles.toggleText, accountType === 'business' && styles.toggleActiveText]}>Business</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Basic Information */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Basic Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.fullName} onChangeText={(v) => handleChange('fullName', v)} placeholder="Enter full name" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.dob ? new Date(formData.dob).toLocaleDateString() : ''} onChangeText={(v) => handleChange('dob', v)} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Occupation</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.occupation} onChangeText={(v) => handleChange('occupation', v)} placeholder="Your occupation" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.mobile} onChangeText={(v) => handleChange('mobile', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Spouse Name (Optional)</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.spouseName} onChangeText={(v) => handleChange('spouseName', v)} placeholder="Enter spouse name" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Spouse Date of Birth (Optional)</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.spouseDob ? new Date(formData.spouseDob).toLocaleDateString() : ''} onChangeText={(v) => handleChange('spouseDob', v)} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Spouse Occupation (Optional)</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.spouseOccupation} onChangeText={(v) => handleChange('spouseOccupation', v)} placeholder="Your spouse's occupation" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Spouse Phone (Optional)</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.spouseMobile} onChangeText={(v) => handleChange('spouseMobile', v)} placeholder="+91 98765 43210" keyboardType="phone-pad" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Aniversary Date</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={new Date(formData.anniversaryDate).toLocaleDateString()} onChangeText={(v) => handleChange('anniversaryDate', v)} placeholder="DD/MM/YYYY" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Address</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.address} onChangeText={(v) => handleChange('address', v)} placeholder="Enter address" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>State</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.state} onChangeText={(v) => handleChange('state', v)} placeholder="Enter state" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Country</Text>
                        <View style={styles.inputWrap}>
                            <TextInput style={styles.input} value={formData.country} onChangeText={(v) => handleChange('country', v)} placeholder="Enter country" placeholderTextColor={Colors.gray500} />
                        </View>
                    </View>
                    <View>
                        <Text style={styles.emailTitle}>All Email Addresses</Text>

                        <View style={{ gap: 12 }}>

                            {/* User Email */}
                            <View>
                                <Text style={styles.label}>Email Address</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.email || ""}
                                        onChangeText={(v) => handleChange('email', v)}
                                        placeholder="your@email.com"
                                        placeholderTextColor={Colors.gray500}
                                    />
                                </View>
                            </View>

                            {/* Spouse Email */}
                            <View>
                                <Text style={styles.label}>Spouse Email (Optional)</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.spouseEmail || ""}
                                        onChangeText={(v) => handleChange('spouseEmail', v)}
                                        placeholder="Enter spouse email"
                                        placeholderTextColor={Colors.gray500}
                                    />
                                </View>
                            </View>

                        </View>
                    </View>

                    <View style={styles.checkboxCard}>
                        <View style={styles.checkboxRow}>

                            <TouchableOpacity disabled={true}>
                                <View style={[
                                    styles.checkbox,
                                    formData.isVerified ? styles.checkboxChecked : null
                                ]}>
                                    {formData.isVerified && (
                                        <Text style={styles.checkMark}>✓</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Read-only. Verification is the club administrator's
                                decision, and the server ignores it from a member. */}
                            <Text style={styles.checkboxLabel}>
                                {formData.isVerified
                                    ? "Verified by the club"
                                    : "Awaiting verification by the club"}
                            </Text>

                        </View>
                    </View>



                    {/* Children Section */}
                    <Text style={styles.subSectionTitle}>Children</Text>

                    {formData.children?.map((child: any, index: number) => (
                        <View key={index} style={styles.childCard}>

                            <View style={styles.childHeader}>
                                <Text style={styles.childTitle}>Child {index + 1}</Text>
                                <TouchableOpacity onPress={() => removeChild(index)}>
                                    <Trash2 color={Colors.error} size={20} />
                                </TouchableOpacity>
                            </View>

                            {/* Name Field */}
                            <Text style={styles.label}>Child Name</Text>
                            <TextInput
                                style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, marginBottom: 12, padding: 12, borderRadius: 10 }]}
                                placeholder="Enter name"
                                placeholderTextColor={Colors.gray400}
                                value={child.name}
                                onChangeText={(v) => handleChildChange(index, 'name', v)}
                            />

                            {/* Age Field */}
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10 }]}
                                placeholder="Enter age"
                                placeholderTextColor={Colors.gray400}
                                value={child.age?.toString()}
                                onChangeText={(v) => handleChildChange(index, 'age', v)}
                                keyboardType="numeric"
                            />
                        </View>
                    ))}
                    <TouchableOpacity style={styles.addBtn} onPress={addChild}>
                        <Plus color={Colors.primary} size={20} />
                        <Text style={styles.addBtnText}>Add Child</Text>
                    </TouchableOpacity>
                </View>

                {/* Business Section */}
                {accountType === "business" && (
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.businessHeader} onPress={() => setShowBusiness(!showBusiness)}>
                            <View>
                                <Text style={styles.sectionTitle}>Business Details</Text>
                                <Text style={styles.subtitle}>Manage your businesses</Text>
                            </View>
                            {showBusiness ? <ChevronUp color={Colors.white} /> : <ChevronDown color={Colors.white} />}
                        </TouchableOpacity>

                        {showBusiness && (
                            <>
                                {formData.businesses.map((biz: any, index: number) => (
                                    <View key={index} style={styles.businessCard}>

                                        <View style={styles.businessHeaderRow}>
                                            <Text style={styles.businessTitle}>Business {index + 1}</Text>
                                            {formData.businesses.length > 1 && (
                                                <TouchableOpacity onPress={() => removeBusiness(index)}>
                                                    <Trash2 color={Colors.error} size={22} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <TouchableOpacity onPress={() => pickImage("businessCoverImage", index)} style={styles.businessImageUpload} >
                                            {(preview.businessCoverImages[index] ||
                                                biz.businessCoverImage) ? (
                                                <Image source={{ uri: preview.businessCoverImages[index] || biz.businessCoverImage, }} style={styles.businessImage} /> ) : ( <Text style={styles.uploadText}> Upload Business Cover Image </Text> )}  </TouchableOpacity>

                                        {/* Business Name */}
                                        <Text style={styles.label}>Business Name</Text>
                                        <TextInput
                                            style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            placeholder="Business Name"
                                            value={biz.businessName}
                                            onChangeText={(v) => handleBusinessChange(index, 'businessName', v)}
                                            placeholderTextColor={Colors.gray500}
                                          />

                                        {/* Category */}
                                        <Text style={styles.label}>Category</Text>
                                        <TextInput
                                            style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            placeholder="Category"
                                            value={biz.businessCategory}
                                            onChangeText={(v) => handleBusinessChange(index, 'businessCategory', v)}
                                            placeholderTextColor={Colors.gray500}
                                        />

                                        {/* Website */}
                                        <Text style={styles.label}>Website</Text>
                                        <TextInput
                                            style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            placeholder="Website"
                                            value={biz.website}
                                            onChangeText={(v) => handleBusinessChange(index, 'website', v)}
                                            placeholderTextColor={Colors.gray500}
                                        />

                                        {/* Phone */}
                                        <Text style={styles.label}>Phone</Text>
                                        <TextInput
                                            style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            placeholder="Phone"
                                            value={biz.businessPhone}
                                            onChangeText={(v) => handleBusinessChange(index, 'businessPhone', v)}
                                            keyboardType="phone-pad"
                                            placeholderTextColor={Colors.gray500}
                                        />

                                        {/* Description */}
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            style={[styles.input, { height: 100, borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            multiline
                                            placeholder="Description"
                                            value={biz.businessDescription}
                                            onChangeText={(v) => handleBusinessChange(index, 'businessDescription', v)}
                                            placeholderTextColor={Colors.gray500}
                                        />
                                        <Text style={styles.label}>Address</Text>
                                        <TextInput
                                            style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            multiline
                                            placeholder="Address"
                                            value={biz.businessAddress}
                                            onChangeText={(v) => handleBusinessChange(index, 'businessAddress', v)}
                                            placeholderTextColor={Colors.gray500}
                                        />
                                        <Text style={styles.label}>Working Hours</Text>
                                        <TextInput
                                            style={[styles.input, { borderWidth: 1, borderColor: Colors.gray200, padding: 12, borderRadius: 10, marginVertical: 4 }]}
                                            multiline
                                            placeholder="Working Hours"
                                            value={biz.businessHours}
                                            onChangeText={(v) => handleBusinessChange(index, 'businessHours', v)}
                                            placeholderTextColor={Colors.gray500}
                                        />


                                    </View>
                                ))}

                                <TouchableOpacity style={styles.addBtn} onPress={addBusiness}>
                                    <Plus color={Colors.primary} size={20} />
                                    <Text style={styles.addBtnText}>Add Another Business</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* Security */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Security</Text>

                    {/* The server asks for the current password before it will
                        change one, so somebody who picks up an unlocked phone
                        cannot lock the member out of their own account. */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Password</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                secureTextEntry={!showPassword}
                                value={formData.currentPassword}
                                onChangeText={(v) => handleChange('currentPassword', v)}
                                placeholder="Needed only to change your password"
                                placeholderTextColor={Colors.gray500}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff color={Colors.gray500} /> : <Eye color={Colors.gray500} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                secureTextEntry={!showPassword}
                                value={formData.password}
                                onChangeText={(v) => handleChange('password', v)}
                                placeholder="New password"
                                placeholderTextColor={Colors.gray500}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff color={Colors.gray500} /> : <Eye color={Colors.gray500} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                secureTextEntry={!showPassword}
                                value={formData.confirmPassword}
                                onChangeText={(v) => handleChange('confirmPassword', v)}
                                placeholder="Confirm new password"
                                placeholderTextColor={Colors.gray500}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff color={Colors.gray500} /> : <Eye color={Colors.gray500} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <GradientButton
                    label="Save All Changes"
                    onPress={handleSubmit}
                    loading={isLoading}
                    size="lg"
                    style={styles.submitButton}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white, },
    scrollContent: { paddingBottom: 40 },

    header: { padding: 24, paddingTop: 60 },
   title: {
  color: Colors.gray900,
  fontSize: Typography.fontSizes['3xl'],
  fontWeight: 'bold',
},

subtitle: {
  color: Colors.gray500,
  fontSize: Typography.fontSizes.base,
},

    emailTitle: {
        color: Colors.white,
        fontSize: Typography.fontSizes.xl, // slightly bigger but responsive
        fontWeight: Typography.fontWeights.bold,
        marginBottom: 12,
    },
    checkboxCard: {
        backgroundColor: Colors.white,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },

    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: 0.6, // like disabled pointer-events-none effect
    },

    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Colors.gray300,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 24,
        paddingTop: 60,
    },

    checkboxChecked: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },

    checkMark: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: "bold",
    },

    checkboxLabel: {
        color: Colors.gray700,
        fontSize: 14,
        fontWeight: "500",
    },
    imageSection: { marginHorizontal: 24, marginBottom: 20 },
    coverContainer: { height: 180, borderRadius: BorderRadius.xl, overflow: 'hidden', position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    changeCoverBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },

    profileContainer: { alignItems: 'center', marginTop: -50 },
    profileImageWrapper: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: Colors.dark.surface, overflow: 'hidden', position: 'relative' },
    profileImage: { width: '100%', height: '100%' },
    cameraBtn: { position: 'absolute', bottom: 4, right: 4, backgroundColor: Colors.primary, padding: 6, borderRadius: 20 },

    card: { backgroundColor: Colors.white, marginHorizontal: 24, marginBottom: 20, borderRadius: BorderRadius.xl, padding: 20, borderWidth: 1, borderColor: Colors.gray200 },
    sectionTitle: { color: Colors.gray900, fontSize: Typography.fontSizes.xl, fontWeight: 'bold', marginBottom: 16 },
    subSectionTitle: { color: Colors.primary, fontSize: Typography.fontSizes.lg, marginVertical: 12 },

    inputGroup: { marginBottom: 16 },
    label: { color: Colors.gray900, fontSize: Typography.fontSizes.sm, marginBottom: 6, marginLeft: 4 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: Colors.gray200 },
    input: { flex: 1, color: Colors.gray900, fontSize: Typography.fontSizes.base },

    toggleContainer: { flexDirection: 'row', backgroundColor: Colors.gray50, borderRadius: 12, padding: 4,borderWidth: 1, borderColor: Colors.gray200, },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    toggleActive: { backgroundColor: Colors.primary },
    toggleText: { color: Colors.gray700 },
    toggleActiveText: { color: Colors.white, fontWeight: '600' },

    childCard: { backgroundColor: Colors.gray50, padding: 16, borderRadius: BorderRadius.lg, marginBottom: 12 },
    childHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

    businessHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 },
    businessCard: { backgroundColor: Colors.dark.bg, padding: 16, borderRadius: BorderRadius.lg, marginBottom: 16 },
    businessHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    businessImageUpload: { height: 140, backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    businessImage: { width: '100%', height: '100%', borderRadius: BorderRadius.lg },

    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: BorderRadius.lg, marginTop: 8 },
    addBtnText: {
        color: Colors.primary,
        fontWeight: '600',
    },

    submitButton: {
        marginHorizontal: 24,
        marginTop: 10,
    },

    changeCoverText: {
        color: Colors.white,
        fontSize: Typography.fontSizes.sm,
        fontWeight: Typography.fontWeights.medium,
    },

    childTitle: {
        color: Colors.gray900,
        fontSize: Typography.fontSizes.base,
        fontWeight: Typography.fontWeights.semibold,
    },

    businessTitle: {
        color: Colors.gray900,
        fontSize: Typography.fontSizes.base,
        fontWeight: Typography.fontWeights.semibold,
    },

    uploadText: {
        color: Colors.gray400,
        fontSize: Typography.fontSizes.sm,
        textAlign: 'center',
    },
});