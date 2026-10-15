import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { X, Heart, Send, ChevronDown, ChevronUp } from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import { Colors, Typography, BorderRadius } from '@/constants/theme';
import { COMMENTS } from '@/data/dummyData';
import { addCommentPost, replyToComment } from "@/service/post";
import { Alert } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setPostComment, setPostReplyComment } from "@/redux-toolkit/slice/postSlice";
import { useAppDispatch } from '@/redux-toolkit/customHook/hook';

interface Props {
  visible: boolean;
  post: any;
  onClose: () => void;
}

export default function CommentSheet({ visible, post, onClose }: Props) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [showReplies, setShowReplies] = useState<{ [key: string]: boolean }>({});
  const [comments, setComments] = useState(post?.comments || []);

  useEffect(() => {
    setComments(post?.comments || []);
  }, [post]);

  const handleSendComment = async () => {
    const user = await AsyncStorage.getItem("user");
    const userId = user ? JSON.parse(user)._id : null;
    const fullName = user ? JSON.parse(user).fullName : null;

    if (!text.trim()) return;
    let obj = { postId: post.id, text: text.trim(), userId: userId, fullName: fullName }; // userId can be set from context or AsyncStorage
    setLoading(true);
    try {
      const res = await addCommentPost(obj);
      if (res.status === 200) {
        const newComment = {
          _id: Date.now().toString(), text: text.trim(), createdAt: new Date().toISOString(), likes: [], replies: [],
          user: { _id: userId, fullName, profileImage: JSON.parse(user || '{}')?.profileImage || '' },
        };

        dispatch(setPostComment({ postId: post.id, text: text.trim(), userId, fullName }));
        /* No success alert: the comment appears in the list below, which is
           the confirmation. A modal on top of it just has to be dismissed. */
        setComments((prev: any) => [...prev, newComment]);
        setText('');
      }
    }
    catch (err: any) {
      console.log('Error adding comment:', err?.response?.data?.message || err?.message);
      Alert.alert("Add Comment Failed", err?.response?.data?.message || err?.message || "An error occurred while adding your comment. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleSendReply = async () => {
    const user = await AsyncStorage.getItem("user");
    const userId = user ? JSON.parse(user)._id : null;
    const fullName = user ? JSON.parse(user).fullName : null;
    if (!replyText.trim()) return;
    try {
      let obj = { postId: post.id, commentId: replyTo, text: replyText.trim(), userId: userId, fullName: fullName };
      setReplyLoading(true);
      const res = await replyToComment(obj);
      if (res.status === 200) {
        const newReply = {
          _id: Date.now().toString(),
          text: replyText.trim(),
          createdAt: new Date().toISOString(),
          user: {
            _id: userId,
            fullName,
            profileImage: JSON.parse(user || '{}')?.profileImage || '',
          },
        };
        setComments((prev: any) =>
          prev.map((comment: any) => {
            if (comment._id === replyTo) {
              return {
                ...comment,
                replies: [...comment.replies, newReply],
              };
            }
            return comment;
          })
        );
        dispatch(setPostReplyComment(obj));
        // Same reasoning as the comment above: the reply is already on screen.
        setReplyText('');
        setReplyTo(null);
      }
    }
    catch (err: any) {
      console.log(err);
      console.log('Error adding reply:', err?.response?.data?.message || err?.message);
      Alert.alert("Add Reply Failed", err?.response?.data?.message || err?.message || "An error occurred while adding your reply. Please try again.");
    } finally {
      setReplyLoading(false);
    }
  }


  const renderComment = ({ item }: any) => (
    <View style={styles.commentRow}>
      <Avatar uri={item?.user?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"} size={36} />
      <View style={styles.commentBubble}>
        <Text style={styles.commentUser}>{item?.user?.fullName}</Text>
        <Text style={styles.commentText}>{item?.text}</Text>
        <View style={styles.commentMeta}>

          <Text style={styles.commentTime}>{new Date(item?.createdAt).toLocaleString()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>

            <TouchableOpacity onPress={() => setReplyTo(item._id)}>
              <Text style={styles.replyBtn}>Reply</Text>
            </TouchableOpacity>

            {item?.replies?.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  setShowReplies(prev => ({
                    ...prev,
                    [item._id]: !prev[item._id],
                  }))
                }
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Text style={styles.replyBtn}>
                  {item.replies.length} Replies
                </Text>

                {showReplies[item._id] ? (
                  <ChevronUp color={Colors.primary} size={16} />
                ) : (
                  <ChevronDown color={Colors.primary} size={16} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
        {replyTo === item._id && (
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write reply..."
              placeholderTextColor={Colors.gray500}
             style={{
  flex: 1,
  backgroundColor: Colors.gray100,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  color: Colors.gray900,
  borderWidth: 1,
  borderColor: Colors.gray200,
}}
            />

            <TouchableOpacity
              onPress={handleSendReply}
              style={{ justifyContent: 'center' }}
              disabled={!replyText.trim() || replyLoading}
            >
              {replyLoading ? <ActivityIndicator color={Colors.primary} /> : <Send color={Colors.primary} size={18} />}
            </TouchableOpacity>
          </View>
        )}
        {showReplies[item._id] &&
          item.replies?.map((r: any) => (
            <View key={r._id} style={styles.reply}>
              <Avatar uri={r?.user?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2d"} size={28} />
              <View style={[styles.commentBubble, { flex: 1 }]}>
                <Text style={styles.commentUser}>{r?.user?.fullName}</Text>
                <Text style={styles.commentText}>{r?.text}</Text>
              </View>
            </View>
          ))}
      </View>
      <View style={styles.likeCol}>
        <Heart color={Colors.gray700} size={16} />
        <Text style={styles.likeCount}>{item.likes}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={Colors.gray900} size={22} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={comments}
            keyExtractor={i => i._id}
            renderItem={renderComment}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.gray500}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} disabled={!text.trim()} onPress={handleSendComment}>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <Send color={text.trim() ? Colors.primary : Colors.gray500} size={20} />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
  backgroundColor: Colors.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  maxHeight: "80%",
  minHeight: "50%",
},
  handle: {
    width: 40,
    height: 4,
   backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
   borderBottomColor: Colors.gray200,
  },
  sheetTitle: {
   color: Colors.gray900,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
  },
 commentBubble: {
  flex: 1,
  backgroundColor: Colors.gray50,
  borderRadius: BorderRadius.lg,
  padding: 12,
},
  commentUser: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    marginBottom: 4,
  },
  commentText: {
    color: Colors.gray800,
    fontSize: Typography.fontSizes.base,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  commentTime: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.xs,
  },
  replyBtn: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  reply: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
   borderTopColor: Colors.gray200,
  },
  likeCol: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
  },
  likeCount: {
    color: Colors.gray700,
    fontSize: Typography.fontSizes.xs,
  },
 inputRow: {
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 10,
  padding: 16,
  borderTopWidth: 1,
  borderTopColor: Colors.gray200,
  backgroundColor: Colors.white,
},
 input: {
  flex: 1,
  backgroundColor: Colors.gray100,
  borderRadius: BorderRadius.xl,
  paddingHorizontal: 16,
  paddingVertical: 10,
  color: Colors.gray900,
  fontSize: Typography.fontSizes.base,
  maxHeight: 100,
},  
  sendBtn: {
    padding: 8,
  },
});
