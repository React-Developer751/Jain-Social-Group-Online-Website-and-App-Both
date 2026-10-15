import React, { useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Animated, Pressable} from 'react-native';
import { Heart, MessageCircle, Share2, Bookmark, MoveHorizontal as MoreHorizontal, BadgeCheck } from 'lucide-react-native';
import { Colors, Typography, BorderRadius, Spacing } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { useApp } from '@/context/AppContext';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {useEffect} from "react";
import { useAppDispatch } from '@/redux-toolkit/customHook/hook';
import { Alert } from 'react-native';
import { setDeletePostFromList, setHidePostFromList } from '@/redux-toolkit/slice/postSlice';
import { deletePostByUser } from '@/service/post';
import ConfirmDialog from '@/components/forms/ConfirmDialog';
import PostDialog from "@/components/forms/PostDialog";
import { router } from 'expo-router';
import {blockedUser} from "@/service/block";
import { hidePost } from "@/service/post";
import {setRemoveUser} from "@/redux-toolkit/slice/userSlice";
import { setBlockUser } from '@/redux-toolkit/slice/chatSlice';
import ReportModal from "@/components/ui/ReportModal";
import { usePresence } from "@/hooks/usePresence";

const { width: SCREEN_W } = Dimensions.get('window');

interface Post {
  id: string;
  user: any;
  title:string;
  notes:string;
  description: string;
  type: "public" | "private",
  images: string[];
  likes: string[];
  comments: any[];
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  timestamp: string;
  tags?: string[];
} 

interface Props {
  post: Post;
  onComment?: (post: Post) => void;
  onShare?: (post: Post) => void;
}

export default function PostCard({ post, onComment, onShare }: Props) {
  // Live presence, not the flag baked into the fetched list.
  const isOnline = usePresence();
  const dispatch = useAppDispatch();
  const { toggleLike, toggleSave } = useApp();
  const heartScale = useRef(new Animated.Value(1)).current;
  const [showMenu, setShowMenu] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePostData, setDeletePostData] = useState<Post | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);  
  const [initialData, setInitalData] = useState<Post | null>(null);
  const [postListRefresh, setPostListRefresh] = useState<boolean>(false);
  const [blockUserData, setBlockUserData] = useState<any>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [openReportModal, setOpenReportModal] = useState(false);
  const [openPostReportData, setOpenPostReportModal] = useState(null);

  /**
   * "Hide post" — App Store Guideline 1.2. Removes a single post from this
   * member's own feed immediately, without waiting for a moderator.
   */
  const handleHidePost = async () => {
    const userData = await AsyncStorage.getItem("user");
    const userId = userData ? JSON.parse(userData)?._id : null;

    if (!userId) return;

    const postId = (post as any)?._id || post?.id;

    try {
      const res = await hidePost({ userId, postId });
      if (res.status === 200) {
        dispatch(setHidePostFromList({ postId }));
        Alert.alert("Post hidden", "You will not see this post in your feed any more.");
      }
    } catch (err: any) {
      Alert.alert("Could not hide post", err?.response?.data?.message || err?.message);
    }
  };

  const handleBlockUser = async() => {
     const userData = await AsyncStorage.getItem("user");
     const fromId = userData ? JSON.parse(userData)?._id : null;
    let obj = {fromId, toId:blockUserData?._id};
    try{
      setBlockLoading(true);
      const res = await blockedUser(obj);
      if(res.status === 200){
        Alert.alert("User Blocked.", res?.data?.message);
               dispatch(setBlockUser({chatId:res?.data?.chatId, toId:blockUserData?._id, fromId:fromId}));
        dispatch(setRemoveUser(blockUserData?._id));
        setBlockDialogOpen(false);
        setBlockUser(null)
      }
    }
    catch(err:any){
      console.log(err);
      Alert.alert("User Blocked Failed.", err?.response?.data?.message || err?.message || "User Blocked Process Failed.");
    }
    finally{
      setBlockLoading(false);
    }
  }


  useEffect(() => {
  const getUser = async () => {
    const userData = await AsyncStorage.getItem('user');

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setCurrentUserId(parsedUser?._id);
    }
  };

  getUser();
}, []);

 const handleDeletePost = async() => {
    let obj = { postId: post?.id, userId: currentUserId };
    try {
      setDeleteLoading(true);
      const res = await deletePostByUser(obj);
      if (res?.status === 200) {
        Alert.alert("Post Delete.", res?.data?.message);
        dispatch(setDeletePostFromList({ postId: post?.id , userId: currentUserId }));
        setDeleteDialogOpen(false);
        setDeletePostData(null);
      }
    } catch (err:any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Post Delete Failed.", err?.response?.data?.message || err?.message);
    }finally{
      setDeleteLoading(false);
    }
   };

  /* A club post is written by an administrator, and an admin record keeps its
     name in `name` while a member keeps it in `fullName`. Reading only
     `fullName` left every club post showing a blank byline. */
  const authorName = post?.user?.fullName || (post?.user as any)?.name || 'Admin';

  const handleLike = () => {
    toggleLike(post.id);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  };
 const isOwner = post?.user?._id === currentUserId ;
  return (
    <> 
    <ReportModal visible={openReportModal} onClose={()=>{setOpenReportModal(false)}} initialData={{ ...(openPostReportData || {}), reportType: "post" }} onReported={() => dispatch(setHidePostFromList({ postId: (post as any)?._id || post?.id }))}/>
     <ConfirmDialog
        visible={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        loading={blockLoading}
        title={`Block ${blockUserData?.fullName || ""}`}
        description={`Are you sure you want to block the user "${blockUserData?.fullName || ""}"? They will no longer be able to message or view your profile.`}
        buttonName="Block"
        onConfirm={handleBlockUser}
        />

      <PostDialog
        visible={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        setPostListRefresh={setPostListRefresh}
        initialData={initialData}
      />

    <ConfirmDialog visible={deleteDialogOpen}loading={deleteLoading} onConfirm={handleDeletePost} title="Delete Post" description="Are you sure you want to delete this post?" onClose={() => setDeleteDialogOpen(false)} buttonName="Delete" />
    <View style={styles.card}>
      {/* Header */}
      
      <View style={styles.header} >
        <Avatar uri={post?.user?.profileImage || 'https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2'} size={44} isOnline={isOnline(post?.user?._id)} />
      <Pressable
      style={{flex : 1}}
onPress={() =>
  !isOwner
    ? (router.push(`/profile/${post?.user?._id}`), setShowMenu(false))
    : null
}
>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{authorName}</Text>
            {post?.user?.isVerified && <BadgeCheck color={Colors.primary} size={16} />}
          </View>
          <Text style={styles.meta}>
            {authorName} · {post.timestamp}
          </Text>
        </View>
        </Pressable>
    
  <View style={{ position: "relative" }}>
    <TouchableOpacity
      style={styles.moreBtn}
      onPress={() => setShowMenu(!showMenu)}
    >
      <MoreHorizontal color={Colors.gray700} size={20} />
    </TouchableOpacity>

    {showMenu && (
      <View style={styles.dropdownMenu}>
        {
          isOwner ? <>
           <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setInitalData(post); setShowCreatePost(true); setShowMenu(false); }}>
          <Text style={styles.menuText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setDeletePostData(post); setDeleteDialogOpen(true); setShowMenu(false); }}
        >
          <Text style={[styles.menuText, { color: "#EF4444" }]}>
            Delete
          </Text>
        </TouchableOpacity>
          </>
          :
          <>
           <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setBlockUserData(post?.user); setBlockDialogOpen(true); setShowMenu(false); }}>
          <Text style={styles.menuText}>Block User</Text>
        </TouchableOpacity>
          <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setOpenPostReportModal(post as any); setOpenReportModal(true); setShowMenu(false); }}>
          <Text style={styles.menuText}>Report Post</Text>
        </TouchableOpacity>
          <TouchableOpacity
          style={styles.menuItem}
          onPress={() => { setShowMenu(false); handleHidePost(); }}>
          <Text style={styles.menuText}>Hide Post</Text>
        </TouchableOpacity>
          </>
        } 
      </View>
    )}
  </View>

      </View>
 
      {/* Text */}
        {post.title ? <Text style={styles.text}>{post.title}</Text> : null}
      {post.description ? <Text style={styles.text}>{post.description}</Text> : null}
      {post.notes ? <Text style={styles.text}>{post.notes}</Text> : null}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tags}>
          {post.tags.map(tag => (
            <Text key={tag} style={styles.tag}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      {/* Images */}
      {post?.images?.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageScroll}
        >
          {post.images.map((img, i) => (
            <Image
              key={i}
              source={{ uri: img }}
              style={[styles.postImage, { width: SCREEN_W - 24, }]}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Heart
                color={post?.likes?.includes(currentUserId) ? Colors.error : Colors.gray400}
                fill={post?.likes?.includes(currentUserId) ? Colors.error : 'transparent'}
                size={22}
              />
            </Animated.View>
            <Text style={[styles.actionCount, post?.likes?.includes(currentUserId) && { color: Colors.error }]}>
              {formatCount(post.likes?.length || 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onComment?.(post)}>
            <MessageCircle color={Colors.gray400} size={22} />
            <Text style={styles.actionCount}>{formatCount(post.comments.length || 0)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => onShare?.(post)}>
            <Share2 color={Colors.gray400} size={22} />
            {/* <Text style={styles.actionCount}>{formatCount(post.shares)}</Text> */}
          </TouchableOpacity>
        </View>

        {/* <TouchableOpacity onPress={() => toggleSave(post.id)}>
          <Bookmark
            color={post.isSaved ? Colors.primary : Colors.gray400}
            fill={post.isSaved ? Colors.primary : 'transparent'}
            size={22}
          />
        </TouchableOpacity> */}
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  // card: {
  //   backgroundColor: Colors.dark.surface,
  //   marginBottom: 8,
  //   paddingTop: 16,
  // },
  card: {
  backgroundColor: Colors.white,
  marginHorizontal: 12,
  marginTop: 10,
  marginBottom: 12,
  borderRadius: 18,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: Colors.gray100,
  paddingTop: 16,
},
 header: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  marginBottom: 12,
},
  dropdownMenu: {
  position: "absolute",
  top: 30,
  right: 0,
  backgroundColor: Colors.white,
  borderRadius: 10,
  minWidth: 120,
  borderWidth: 1,
  borderColor: Colors.gray200,
  zIndex: 999,
  elevation: 10,
},

menuItem: {
  paddingVertical: 12,
  paddingHorizontal: 16,
},

menuText: {
  color: Colors.gray900,
  fontSize: 14,
  fontWeight: "500",
},
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  meta: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  moreBtn: {
    padding: 12,
  },
  text: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tag: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
  },
  imageScroll: {
    marginBottom: 4,
  },
 postImage: {
  height: 420,
  borderRadius: 0,
},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    color: Colors.gray700,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.medium,
  },
});
