import React, { use, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet} from 'react-native';
import { Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar from '@/components/ui/Avatar';
import { Colors, Typography } from '@/constants/theme';
import { CURRENT_USER } from '@/data/dummyData';
import { getAllUser } from '@/service/auth';
import { setUserList, setUserCount, setRemoveUser, setRecoverUser } from '@/redux-toolkit/slice/userSlice';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSocket } from '@/socket/socket';


interface Props {
  onStoryPress?: (story: any) => void;
  onAddStory?: () => void;
}

export default function StoryBar({ onStoryPress, onAddStory }: Props) {
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const userList = useAppSelector((state) => state.user.userList);
  const [user, setUser] = useState<any>(null);
  
useEffect(() => {
  if(!socket) return;
    socket.on("deleteUser", (data:any) => {
     dispatch(setRemoveUser(data))
    });

    socket.on("recoverUser", (data:any) => {
     dispatch(setRecoverUser(data));
    })
    return () => {
      socket.off("deleteUser");
      socket.off("recoverUser");
    }
   },[])
 useEffect(() => {
  const getUser = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  };

  if(user === null){
  getUser();  
  }
}, []);

  useEffect(() => {
    let mounted = true;

    const fetchUsers = async (userId: string) => {
      if (!userId) return;
      try {
        const res = await getAllUser(userId);
        const users = res?.data?.data ?? [];
        if (!mounted) return;
        dispatch(setUserList(users));
        dispatch(setUserCount(users.length));
      } catch (err:any) {
        console.log(err?.response?.data?.message);
      }
    };

    fetchUsers(user?._id);

    return () => {
      mounted = false;
    };
  }, []);
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll} >
        {/* Add Story */}
        <TouchableOpacity style={styles.storyItem} onPress={onAddStory}>
          <View style={styles.addStory}>
            <Avatar uri={user?.profileImage || 'https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2'} size={56} />
            <LinearGradient
              colors={Colors.gradients.primary as [string, string]} style={styles.addBtn}
            >
              <Plus color={Colors.white} size={14} />
            </LinearGradient>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>
            Your story
          </Text>
        </TouchableOpacity>

        {/* Stories (from backend via Redux) */}
        {userList?.map(user => {
          const story = {
            id: user?._id,
            user: { 
              id: user?._id,
              avatar: user?.profileImage || 'https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2', 
              name: user?.fullName || '' 
            },
            viewed: false,
          };

          return (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              onPress={() => onStoryPress?.(story)}
            >
              <Avatar
                uri={story.user.avatar}
                size={56}
                hasStory
                storyViewed={story.viewed}
              />
              <Text style={styles.storyName} numberOfLines={1}>
                {story.user.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  scroll: {
    paddingHorizontal: 12,
    gap: 12,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
    gap: 6,
  },
  addStory: {
    position: 'relative',
  },
  addBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  storyName: {
    color: Colors.gray700,
    fontSize: Typography.fontSizes.xs,
    textAlign: 'center',
  },
});
