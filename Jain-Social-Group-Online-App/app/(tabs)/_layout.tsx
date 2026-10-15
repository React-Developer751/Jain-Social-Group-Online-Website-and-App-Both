import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Hop as Home, MessageCircle, Users, Calendar, User } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getSocket } from '@/socket/socket';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function TabLayout() {
  const socket = getSocket();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any | null>();

  useEffect(() => {

    const subscription = AppState.addEventListener(
        "change",
        handleAppStateChange
    );

    return () => subscription.remove();

}, []);

const handleAppStateChange = (nextState: string) => {

    if (!user?._id || !socket) return;
   
    if (nextState === "background") {
        socket.emit("userOffline", user._id);
    }

    if (nextState === "active") {
        socket.emit("userOnline", user._id);

    }

};

  useEffect(() => {
    const getUser = async() => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    if(user === null){
    getUser();   
    }
  },[user])
  return (
    <Tabs
     screenOptions={{
  headerShown: false,
  tabBarStyle: [
    styles.tabBar,
    {
      height: 64 + insets.bottom,
      paddingBottom: Math.max(insets.bottom, 10),
    },
  ],
  tabBarActiveTintColor: Colors.primary,
  tabBarInactiveTintColor: Colors.gray500,
  tabBarLabelStyle: styles.tabLabel,
  tabBarShowLabel: true,
}}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.medium,
  },
});
