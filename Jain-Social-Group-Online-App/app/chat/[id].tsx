import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, TouchableWithoutFeedback, Image, StyleSheet, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Keyboard, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Video as VideoIcon, MoveVertical as MoreVertical, Send, Smile, Paperclip, Mic, Image as ImageIcon, FileText } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';
import Avatar from '@/components/ui/Avatar';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/customHook/hook';
import { blockUser, getMessages, sendMessage, unblockUser,deleteAllMessagesForMe, deleteMessageForMe, deleteMessageForEveryone } from "@/service/chat";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '@/socket/socket';
import { setBlockUser, setExitUserFromGroup, setMessageList, setMessageRefresh, setNewMessageAdd, setUnblockUserToChat } from '@/redux-toolkit/slice/chatSlice';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { exitMemberFromGroup } from '@/service/group';
import ConfirmDialog from '@/components/forms/ConfirmDialog';
import { Video, ResizeMode } from "expo-av";
import {BackHandler} from "react-native";
import { setRemoveUser, setRecoverUser } from '@/redux-toolkit/slice/userSlice';
import { usePresence } from "@/hooks/usePresence";

/**
 * The emoji panel's contents.
 *
 * A plain list rather than a third-party emoji keyboard: a picker library is a
 * native dependency and a store review risk for a handful of characters that
 * are just text. These are the ones people actually reach for in a chat.
 */
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "\u{1F600}", "\u{1F603}", "\u{1F604}", "\u{1F601}", "\u{1F606}", "\u{1F605}", "\u{1F923}", "\u{1F602}",
      "\u{1F642}", "\u{1F643}", "\u{1F609}", "\u{1F60A}", "\u{1F607}", "\u{1F970}", "\u{1F60D}", "\u{1F929}",
      "\u{1F618}", "\u{1F617}", "\u{1F61A}", "\u{1F60B}", "\u{1F61B}", "\u{1F61C}", "\u{1F92A}", "\u{1F60E}",
      "\u{1F914}", "\u{1F910}", "\u{1F610}", "\u{1F611}", "\u{1F636}", "\u{1F60F}", "\u{1F612}", "\u{1F644}",
      "\u{1F62A}", "\u{1F634}", "\u{1F622}", "\u{1F62D}", "\u{1F629}", "\u{1F633}", "\u{1F631}", "\u{1F621}",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "\u{1F44D}", "\u{1F44E}", "\u{1F44C}", "\u{270C}", "\u{1F91E}", "\u{1F918}", "\u{1F44F}", "\u{1F64C}",
      "\u{1F64F}", "\u{1F91D}", "\u{1F4AA}", "\u{1F449}", "\u{1F448}", "\u{1F446}", "\u{1F447}", "\u{270B}",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "\u{2764}", "\u{1F9E1}", "\u{1F49B}", "\u{1F49A}", "\u{1F499}", "\u{1F49C}", "\u{1F494}", "\u{1F495}",
      "\u{1F496}", "\u{1F49D}", "\u{2728}", "\u{1F525}", "\u{1F389}", "\u{1F38A}", "\u{1F381}", "\u{1F340}",
    ],
  },
  {
    label: "Other",
    emojis: [
      "\u{1F64F}", "\u{1F4AF}", "\u{2705}", "\u{274C}", "\u{26A0}", "\u{1F514}", "\u{1F4DE}", "\u{1F4E9}",
      "\u{1F4CD}", "\u{1F4C5}", "\u{23F0}", "\u{1F680}", "\u{2615}", "\u{1F37D}", "\u{1F3E0}", "\u{1F697}",
    ],
  },
];

/**
 * Whether an attachment URL is a document rather than something to display.
 *
 * Cloudinary serves anything that is not an image or a video from a `/raw/`
 * path, which is the reliable signal; the extension is the fallback for URLs
 * stored before that was true. A document rendered as an <Image/>, which is
 * what every attachment used to get, is just a broken grey box.
 */
const isDocumentUrl = (url: string) =>
  /\/raw\/upload\//.test(url || "") ||
  /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)(\?|$)/i.test(url || "");

/** The file name Cloudinary kept, for showing on a document chip. */
const fileNameFromUrl = (url: string) => {
  try {
    const last = decodeURIComponent((url || "").split("?")[0].split("/").pop() || "");
    return last || "Attachment";
  } catch {
    return "Attachment";
  }
};

/**
 * What fills the message area when there is nothing to show.
 *
 * The invitation to write the first message is only true once the request has
 * answered. The screen now clears the previous conversation before loading the
 * next one, so without this check "Start the Conversation" would flash on top
 * of every chat that is still loading.
 */
const EmptyConversation = ({ loading }: { loading: boolean }) => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 280, paddingHorizontal: 30 }}>
    {loading ? (
      <ActivityIndicator size="small" color={Colors.gray400} />
    ) : (
      <>
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 8 }}>
          Start the Conversation
        </Text>
        <Text style={{ fontSize: 14, color: "#777", textAlign: "center", lineHeight: 22 }}>
          No messages yet. Send your first message and start chatting.
        </Text>
      </>
    )}
  </View>
);

export default function ChatDetailScreen() {
  // Live presence, not the stale flag baked into the fetched list.
  const isOnline = usePresence();
  const socket = getSocket();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id: string }>();// y id hi chatId hai |||||
  const [text, setText] = useState('');
  const [user, setUser] = useState<any | null>();
  const [loading, setLoading] = useState<boolean>(false);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  /* Open emoji panel, and the document waiting to be sent. A document gets
     its own preview: it has no thumbnail to show. */
  const [showEmoji, setShowEmoji] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteGroupData, setDeleteGroupData] = useState<any>(null);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
 const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0});
const [deleteOptionOpen, setDeleteOptionOpen] = useState(false);
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [deleteType, setDeleteType] = useState<"me" | "everyone" | null>(null);
const [messageDeleteLoading, setMessageDeleteLoading] = useState(false);
const [allMessageDeleteLoading, setAllMessageDeleteLoading] = useState(false);
const [allMessageDeleteDialog, setAllMessageDeleteDialog] = useState(false);

const layoutsRef = useRef<Record<string, any>>({});

  const userList = useAppSelector((state) => state?.chat?.userChatList);

  const chatUserData = userList.find((u) => u?.chatId === id)
  const messageList = useAppSelector((state) => state?.chat?.messageList);
  const flatRef = useRef<FlatList>(null);
const blockInfo = chatUserData?.blockedMembers?.find( (member: any) => member.user?.toString() === chatUserData?.friend?._id?.toString());

const isBlocked = !!blockInfo;

const isBlocker = blockInfo?.blockedBy?.toString() === user?._id?.toString();
// 1) openDeleteMenu function update — isSent parameter add kiya
const openDeleteMenu = (message: any, x: number, y: number, isSent: boolean) => {
  const menuWidth = 130;
  const screenPadding = 10;

  // sent (right side) message => menu LEFT me khulega
  // received (left side) message => menu RIGHT me khulega
  const adjustedX = isSent ? x - menuWidth - screenPadding : x + screenPadding;

  setSelectedMessage(message);
  setMenuPosition({ x: adjustedX, y });
  setDeleteOptionOpen(true);
};

const handleDeleteAllMessageForMe = async() => {
  const userData = await AsyncStorage.getItem("user");
  const userId = userData ? JSON.parse(userData)?._id : null;
  if(!id || !userId) return;
  const obj = {userId, chatId:id};
  try{
     setAllMessageDeleteLoading(true);
     const res = await deleteAllMessagesForMe(obj);
     if(res.status=== 200){
      setAllMessageDeleteDialog(false);
      Alert.alert("All message Deleted Successfully.", res?.data?.message || "All message Deleted.")
      
      handleGetMessages();
    }
  }
  catch(err:any){
    Alert.alert( "All Message Delete Failed", err?.response?.data?.message || err?.message );
  }finally{
    setAllMessageDeleteLoading(false);
  }
}

const handleDeleteMessage = async () => {

  if(!selectedMessage || !deleteType) return;

  const userData = await AsyncStorage.getItem("user");
  const userId = userData ? JSON.parse(userData)?._id : null;


  try{
    setMessageDeleteLoading(true);
    let res;

    if(deleteType === "me"){
    res = await deleteMessageForMe({ messageId:selectedMessage?._id, userId });
    }else{
      res = await deleteMessageForEveryone({ messageId:selectedMessage?._id, userId });
    }

    if(res.status === 200){
      Alert.alert( "Success", res?.data?.message || "Message deleted successfully" );

      setDeleteConfirmOpen(false);
      setSelectedMessage(null);
      setDeleteType(null);
      handleGetMessages();
    }
  }
  catch(err:any){
    Alert.alert( "Delete Failed", err?.response?.data?.message || err?.message );
  }
  finally{
    setMessageDeleteLoading(false);
  }
};
 
   const handleBlockUser = async() => {
    try{
      setBlockLoading(true);
      const obj = {chatId: id, toId: chatUserData?.friend?._id, fromId: user?._id};
      const res = await blockUser(obj);
      if(res.status === 200){
        Alert.alert("User Blocked Successfully", res?.data?.message || "User Blocked Successfully");
        setBlockDialogOpen(false);
        dispatch(setBlockUser(obj));
        dispatch(setRemoveUser(chatUserData?.friend));
      }
    }
    catch(err:any){
      console.log(err);
      Alert.alert("Failed to Block User", err?.response?.data?.message || err?.message);
    }
    finally{ 
      setBlockLoading(false);
    }
  };

  const handleUnBlockUser = async() => {
    try{
      setUnblockLoading(true);
      const obj = {chatId: id, toId: chatUserData?.friend?._id, fromId: user?._id};
      const res = await unblockUser(obj);
      if(res.status === 200){
        Alert.alert("User Unblocked Successfully", res?.data?.message || "User Unblocked Successfully");
        setUnblockDialogOpen(false);
        dispatch(setUnblockUserToChat(obj));
        dispatch(setRecoverUser(chatUserData?.friend));
      }
    }
    catch(err:any){
      console.log(err);
      Alert.alert("Failed to Unblock User", err?.response?.data?.message || err?.message);
    }
    finally{
      setUnblockLoading(false);
    }
  };

  useEffect(() => {
    const backAction = () => {
      return true;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => subscription.remove();

  },[]);
 

  const handleExitGroup = async () => {
    try {
      setDeleteLoading(deleteGroupData?._id);
      const res = await exitMemberFromGroup({ chatId: id, userId: user?._id });
      if (res.status === 200 || res.status === 201) {
        Alert.alert(`${deleteGroupData?.isGroup ? "Exit Group" : "Leave Chat"}`, res?.data?.message || "You have exited the group successfully");
        setDeleteGroupData(null);
        setDeleteGroupOpen(false);
        dispatch(setExitUserFromGroup({ chatId: id, userId: user?._id }));
        router.replace('/(tabs)/chat');
      }
    } catch (err: any) {
      console.log(err);
      Alert.alert("Failed to Exit Group.", err?.response?.data?.message || err?.message || "An error occurred");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;

    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;

    setShowScrollBtn(!isNearBottom);
  };

  /**
   * The paperclip.
   *
   * It had no handler at all, so tapping it did nothing. Documents go up the
   * same way a photo does — the server takes any file on the `image` field and
   * Cloudinary stores a PDF as a raw file — so the only new part is telling
   * them apart afterwards, which `isDocumentUrl` does.
   */
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        /* Any file. A wildcard like "image/*" does not map to an iOS UTI, so
           naming types here would quietly hide most of them; the server stores
           whatever arrives and the size check below is the real limit. */
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];
      if (!file) return;

      // 5 MB is the server's own limit; catching it here saves a failed upload.
      if (typeof file.size === "number" && file.size > 5 * 1024 * 1024) {
        Alert.alert("File too large", "Please choose a file under 5 MB.");
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name || "document",
        type: file.mimeType || "application/octet-stream",
      });

      /* Only something with a thumbnail goes in the image preview. A document
         is shown as a named chip instead. */
      setPreviewUrl(file.mimeType?.startsWith("image/") ? file.uri : "");
    } catch (err: any) {
      Alert.alert("Could not open files", err?.message ?? "Please try again.");
    }
  };

  /** Puts an emoji where the member is typing. */
  const addEmoji = (emoji: string) => setText((current) => current + emoji);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });

    if (!result.canceled) {
      const file = result.assets[0];

      const mimeType = file.mimeType || (file.uri.endsWith(".png") ? "image/png" : "image/jpeg");

      setSelectedFile({
        uri: file.uri,
        name: file.fileName || "photo.jpg",
        type: mimeType,
      });

      setPreviewUrl(file.uri);
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on("messageRefresh", (newMessage: any, updatedAt: string) => {
      if (newMessage.chatId?.toString() === id?.toString()) {
        dispatch(setNewMessageAdd(newMessage));
        socket.emit("messageSeen", { chatId: newMessage.chatId, receiverUserId: user?._id, senderUserId: chatUserData?.friend?._id });
      }
      dispatch(setMessageRefresh({ newMessage, updatedAt }));
    });
    socket.on("typingChat", () => {
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    });

    /* The old handler here destructured `{ userId }` from this event, but the
       server sends the id as a plain string, so it always read undefined and
       marked nobody offline. Presence is read from usePresence() now, which
       tracks the same events in one place. */

    socket.on("messageSeen", (data: any) => {
      if (data?.chatId === id) {
        dispatch(setMessageList(data?.messages));
      }
    });

    socket.on("blockUser", (data) => {
      dispatch(setBlockUser(data));
      if (data?.friend) {
        dispatch(setRemoveUser(data.friend));
      } else if (data?.toId) {
        dispatch(setRemoveUser({ _id: data.toId }));
      }
    });

    socket.on("unblockUser", (data) => {
      dispatch(setUnblockUserToChat(data));
      if (data?.friend) {
        dispatch(setRecoverUser(data.friend));
      } else if (data?.blockedId) {
        dispatch(setRecoverUser(data.blockedId));
      }
    });

    return () => {
      socket.off("messageRefresh");
      socket.off("messageSeen");
      socket.off("blockUser");
      socket.off("unblockUser");
    }
  }, []);

  useEffect(() => {
    if (messageList?.length) {
      setTimeout(() => {
        flatRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messageList]);

  const handleGetMessages = useCallback(async () => {
    const userData = await AsyncStorage.getItem("user");
    const userId = userData ? JSON.parse(userData)?._id : null;
    if (!id || !userId) { return; }
    try {
      setMessagesLoading(true);
      const res = await getMessages({chatId : id, userId:userId});
      if (res.status === 200) {
        dispatch(setMessageList(res?.data?.messages));
      }
    }
    catch (err) {
      console.log(err);
    }
    finally {
      setMessagesLoading(false);
    }
  }, [id, dispatch]);

  /* Load once per conversation.
     This used to depend on the message count as well, and the fetch itself
     changes that count, so every chat was loaded twice and every new message
     triggered another full reload. Clearing first means the previous
     conversation's messages are never shown under this one's name. */
  useEffect(() => {
    if (!id) return;

    dispatch(setMessageList([]));
    handleGetMessages();
  }, [id, handleGetMessages, dispatch]);

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      const user = userData ? JSON.parse(userData) : null;
      setUser(user);
    };
    getUser();
  }, []);

  const handleSendMessage = async () => {
    if (!text.trim() && !selectedFile) return;
    const form = new FormData();
    form.append("chatId", id);
    form.append("senderId", user?._id);
    form.append("text", text || "");

    if (selectedFile) {
      const fileToUpload = {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      } as any;

      form.append("image", fileToUpload);
    }
    setLoading(true);
    try {
      const res = await sendMessage(form);
      if (res.status === 201) {
        setText("");
        setSelectedFile(null);
        setPreviewUrl("");
      }
    }
    catch (err: any) {
      console.log(err?.response?.data?.message || err?.message);
      Alert.alert("Message Send Failed.", err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSingleMessage = ({ item, index }: any) => {
    const isSent = item?.sender?._id === user?._id;
    const prevMsg = messageList[index - 1];
    const prevIsSent = prevMsg?.sender?._id === user?._id;
    const showAvatar = !isSent && (!prevMsg || prevIsSent);
    let statusIcon = null;

    if (isSent) {
      if (item?.status === 'sent') statusIcon = '✓';
      else if (item?.status === 'delivered') statusIcon = '✓✓';
      else if (item?.status === 'seen') statusIcon = '✓✓';
    }

    return (
      <View>
        <View style={[styles.msgRow, isSent && styles.msgRowSent]}>
          {!isSent && (
            <View style={styles.msgAvatarArea}>
              {showAvatar ? (
                <Avatar
                  uri={item?.sender?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"}
                  size={28}
                />
              ) : (
                <View style={{ width: 28 }} />
              )}
            </View>
          )}

          {/* ====== MESSAGE CONTENT ====== */}
           <View onLayout={(e) => {
            layoutsRef.current[item._id] = e.nativeEvent.layout; 
            }}
            style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}
            >
            <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={(e) =>{const { pageX, pageY } = e.nativeEvent; openDeleteMenu(item, pageX, pageY, isSent);}}
            >
            {(() => {
              const mediaFiles = [
                ...(item?.images || []),
                ...(item?.postId?.images || []),
              ];

              return (
                <>
                  {/* Message Text */}
                  {item?.text ? (
                    <Text
                      style={[
                        styles.msgText,
                        isSent && styles.msgTextSent,
                        mediaFiles.length > 0 && { marginBottom: 8 },
                      ]}
                    >
                      {item?.text}
                    </Text>
                  ) : null}

                  {/* Shared Post Text */}
                  {item?.postId?.text ? (
                    <Text
                      style={[
                        styles.msgText,
                        isSent && styles.msgTextSent,
                        { marginBottom: 8, fontWeight: "600" },
                      ]}
                    >
                      {item?.postId?.text}
                    </Text>
                  ) : null}

                  {/* Images / Videos */}
                  {mediaFiles.map((file: string, idx: number) => {
                    const isVideo =
                      file?.includes(".mp4") ||
                      file?.includes(".mov") ||
                      file?.includes(".m4v") ||
                      file?.includes(".webm") ||
                      file?.includes("/video/upload/");

                    /* A document has nothing to display, so it gets a chip that
                       opens it. Every attachment used to be rendered as an
                       <Image/>, which for a PDF is a broken grey box. */
                    if (!isVideo && isDocumentUrl(file)) {
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.docChip, isSent && styles.docChipSent]}
                          onPress={() => Linking.openURL(file).catch(() => {
                            Alert.alert("Could not open", "This file could not be opened.");
                          })}
                        >
                          <FileText color={isSent ? Colors.white : Colors.primary} size={18} />
                          <Text
                            style={[styles.docChipName, isSent && styles.docChipNameSent]}
                            numberOfLines={1}
                          >
                            {fileNameFromUrl(file)}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return isVideo ? (
                      <Video
                        key={idx}
                        source={{ uri: file }}
                        style={styles.msgVideo}
                        useNativeControls
                        shouldPlay={false}
                        resizeMode={ResizeMode.COVER}
                      />
                    ) : (
                      <Image
                        key={idx}
                        source={{ uri: file }}
                        style={styles.msgImage}
                      />
                    );
                  })}
                </>
              );
            })()}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text
                style={[
                  styles.msgTime,
                  isSent && styles.msgTimeSent,
                ]}
              >
                {new Date(item?.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isSent && (
                <Text
                  style={{
                    fontSize: 10,
                    color: item?.status === "seen" ? "#22C55E" : "#9CA3AF",
                  }}
                >
                  {statusIcon}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };



  const renderGroupMessage = ({ item, index }: any) => {
    const isSent = item?.sender?._id === user?._id;
    const prevMsg = messageList[index - 1];
    const prevIsSent = prevMsg?.sender?._id === user?._id;
    const showAvatar = !isSent && (!prevMsg || prevIsSent);

    return (
      <View>
        <View style={[styles.msgRow, isSent && styles.msgRowSent]}>
          {!isSent && (
            <View style={styles.msgAvatarArea}>
              {showAvatar ? (
                <>
                  <Avatar
                    uri={item?.sender?.profileImage}
                    size={28}
                  />

                  <Text
                    numberOfLines={1}
                    style={styles.groupUserName}
                  >
                    {item?.sender?.fullName}
                  </Text>
                </>
              ) : (
                <View style={{ width: 28 }} />
              )}
            </View>
          )}
          {/* ====== MESSAGE CONTENT ====== */}
           <View onLayout={(e) => {
            layoutsRef.current[item._id] = e.nativeEvent.layout; 
           }}
           style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}
          >
          <TouchableOpacity
          activeOpacity={0.8}
          onLongPress={(e) =>{const { pageX, pageY } = e.nativeEvent;openDeleteMenu(item, pageX, pageY, isSent);}}
          >
            {(() => {
              const mediaFiles = [
                ...(item?.images || []),
                ...(item?.postId?.images || []),
              ];

              return (
                <>
                  {/* Message Text */}
                  {item?.text ? (
                    <Text
                      style={[
                        styles.msgText,
                        isSent && styles.msgTextSent,
                        mediaFiles.length > 0 && { marginBottom: 8 },
                      ]}
                    >
                      {item?.text}
                    </Text>
                  ) : null}

                  {/* Shared Post Text */}
                  {item?.postId?.text ? (
                    <Text
                      style={[
                        styles.msgText,
                        isSent && styles.msgTextSent,
                        { marginBottom: 8, fontWeight: "600" },
                      ]}
                    >
                      {item?.postId?.text}
                    </Text>
                  ) : null}

                  {/* Images / Videos */}
                  {mediaFiles.map((file: string, idx: number) => {
                    const isVideo =
                      file?.includes(".mp4") ||
                      file?.includes(".mov") ||
                      file?.includes(".m4v") ||
                      file?.includes(".webm") ||
                      file?.includes("/video/upload/");

                    /* A document has nothing to display, so it gets a chip that
                       opens it. Every attachment used to be rendered as an
                       <Image/>, which for a PDF is a broken grey box. */
                    if (!isVideo && isDocumentUrl(file)) {
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.docChip, isSent && styles.docChipSent]}
                          onPress={() => Linking.openURL(file).catch(() => {
                            Alert.alert("Could not open", "This file could not be opened.");
                          })}
                        >
                          <FileText color={isSent ? Colors.white : Colors.primary} size={18} />
                          <Text
                            style={[styles.docChipName, isSent && styles.docChipNameSent]}
                            numberOfLines={1}
                          >
                            {fileNameFromUrl(file)}
                          </Text>
                        </TouchableOpacity>
                      );
                    }

                    return isVideo ? (
                      <Video
                        key={idx}
                        source={{ uri: file }}
                        style={styles.msgVideo}
                        useNativeControls
                        shouldPlay={false}
                        resizeMode={ResizeMode.COVER}
                      />
                    ) : (
                      <Image
                        key={idx}
                        source={{ uri: file }}
                        style={styles.msgImage}
                      />
                    );
                  })}
                </>
              );
            })()}

            <Text
              style={[
                styles.msgTime,
                isSent && styles.msgTimeSent,
              ]}
            >
              {new Date(item?.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>
          </View>

        </View>
      </View>
    );
  };

  return (
    <>
     <ConfirmDialog
     visible={allMessageDeleteDialog}
     onClose={()=>{setAllMessageDeleteDialog(false)}}
     loading={allMessageDeleteLoading}
     title="Delete All Messages"
     description="All messages will be removed only from your chat. This action cannot be undone."
     buttonName="Delete"
     onConfirm={handleDeleteAllMessageForMe}
     />
    <ConfirmDialog
     visible={deleteConfirmOpen}
     onClose={()=>{setDeleteConfirmOpen(false)}}
     loading={messageDeleteLoading}
     title={deleteType==="everyone"?"Delete Message For Everyone":"Delete Message For Me"}
     description={deleteType==="everyone"?"This message will be removed for everyone.":"This message will be removed only from your chat."}
     buttonName="Delete"
     onConfirm={handleDeleteMessage}
     />
     <ConfirmDialog
        visible={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        loading={blockLoading}
        title={`Block ${chatUserData?.friend?.fullName || ""}`}
        description={`Are you sure you want to block the user "${chatUserData?.friend?.fullName || ""}"? They will no longer be able to message or view your profile.`}
        buttonName="Block"
        onConfirm={handleBlockUser}
      />

    <ConfirmDialog
        visible={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        loading={blockLoading}
        title={`Block ${chatUserData?.friend?.fullName || ""}`}
        description={`Are you sure you want to block the user "${chatUserData?.friend?.fullName || ""}"? They will no longer be able to message or view your profile.`}
        buttonName="Block"
        onConfirm={handleBlockUser}
      />
    <ConfirmDialog
        visible={unblockDialogOpen}
        onClose={() => setUnblockDialogOpen(false)}
        loading={unblockLoading}
        title={`Unblock ${chatUserData?.friend?.fullName || ""}`}
        description={`Are you sure you want to unblock the user "${chatUserData?.friend?.fullName || ""}"? This will allow them to send you messages and view your profile again.`}
        buttonName="Unblock"
        onConfirm={handleUnBlockUser}
      />

      <ConfirmDialog
        visible={deleteGroupOpen}
        onClose={() => setDeleteGroupOpen(false)}
        loading={deleteLoading === deleteGroupData?._id}
        title={`${deleteGroupData?.isGroup ? "Exit Group" : "Leave Chat"}`}
        description={`Are you sure you want to ${deleteGroupData?.isGroup ? "exit" : "leave"} this ${deleteGroupData?.isGroup ? "group" : "chat"}?`}
        buttonName="Exit"
        onConfirm={handleExitGroup}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : "height"}
      >
  
{
  deleteOptionOpen && (
    <Pressable
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
      }}
      onPress={() => setDeleteOptionOpen(false)}
    >
      <View
        style={{
          position: "absolute",
          top: menuPosition.y - 8,
          left: menuPosition.x,
          width: 122,
          backgroundColor: "#fff",
          borderRadius: 8,
          paddingVertical: 2,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        }}
        onStartShouldSetResponder={() => true}
      >
        <TouchableOpacity
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderColor: "#eee",
          }}
          onPress={() => {
            setDeleteOptionOpen(false);
            setDeleteType("me");
            setDeleteConfirmOpen(true);
          }}
        >
          <Text style={{ fontSize: 10, color: "#333" }}>Delete For Me</Text>
        </TouchableOpacity>

        {selectedMessage?.sender?._id === user?._id && (
          <TouchableOpacity
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
            onPress={() => {
              setDeleteOptionOpen(false);
              setDeleteType("everyone");
              setDeleteConfirmOpen(true);
            }}
          >
            <Text style={{ fontSize: 10, color: "red" }}>
              Delete For Everyone
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  )
}
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowEmoji(false); }}>
          <View style={[styles.container, { flex: 1 }]} >

            <StatusBar barStyle="light-content" />
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <ArrowLeft color={Colors.black} size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.userInfo}>
                <Avatar uri={(chatUserData?.friend?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2") || chatUserData?.group?.images?.[0]} size={40} isOnline={isOnline(chatUserData?.friend?._id)} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.userName}>{chatUserData?.friend?.fullName ? chatUserData?.friend?.idDeleted ? "Deleted User" : chatUserData?.friend?.fullName : chatUserData?.group?.title}</Text>
                  <Text style={styles.userStatus}>
                    {chatUserData?.isGroup ? 'Group' : isOnline(chatUserData?.friend?._id) ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerIconBtn}>
                  <Phone color={Colors.gray300} size={22} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn}>
                  <VideoIcon color={Colors.gray300} size={22} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMenu(!showMenu)}>
                  <MoreVertical color={Colors.gray300} size={22} />
                </TouchableOpacity>
              </View>
            </View>
            { showMenu && (
              <View style={styles.dropdownMenu}>
                {chatUserData?.isGroup ? (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setDeleteGroupData(chatUserData); setDeleteGroupOpen(true); setShowMenu(false); }}
                  >
                    <Text style={styles.dropdownText}>Exit Group</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                   {chatUserData?.blockedMembers?.some((block:any) => block?.user?.toString() === chatUserData?.friend?._id?.toString()) ?  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setDeleteGroupData(chatUserData); setUnblockDialogOpen(true); setShowMenu(false); }}>
                    <Text style={[styles.dropdownText, { color: "green" }]}>
                      UnBlock User
                    </Text>
                  </TouchableOpacity>
                  :
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setDeleteGroupData(chatUserData); setBlockDialogOpen(true); setShowMenu(false); }}>
                    <Text style={[styles.dropdownText, { color: "orange" }]}>
                      Block User
                    </Text>
                  </TouchableOpacity>}
                   <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setAllMessageDeleteDialog(true); setShowMenu(false); }}>
                    <Text style={[styles.dropdownText, { color: "orange" }]}>
                      Delete Chat
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setDeleteGroupData(chatUserData); setDeleteGroupOpen(true); setShowMenu(false); }}>
                    <Text style={[styles.dropdownText, { color: "red" }]}>
                      Delete User
                    </Text>
                  </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Messages */}
            {chatUserData?.isGroup === false ?
              <FlatList
                ref={flatRef}
                data={messageList}
                renderItem={renderSingleMessage}
                contentContainerStyle={styles.msgList}
                keyExtractor={(m) => m?._id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={() => {
                  flatRef.current?.scrollToEnd({ animated: false });
                }}
                ListEmptyComponent={<EmptyConversation loading={messagesLoading} />}
              />
              :
              <FlatList
                ref={flatRef}
                data={messageList}
                renderItem={renderGroupMessage}
                contentContainerStyle={styles.msgList}
                keyExtractor={(m) => m?._id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={() => {
                  flatRef.current?.scrollToEnd({ animated: false });
                }}
                 ListEmptyComponent={<EmptyConversation loading={messagesLoading} />}
              />
            }
            {showScrollBtn && (
              <TouchableOpacity
                onPress={() => {
                  flatRef.current?.scrollToEnd({ animated: true });
                }}
                style={{
                  position: "absolute",
                  bottom: 90, // input ke upar
                  right: 20,
                  backgroundColor: "#000",
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  elevation: 5,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18 }}>↓</Text>
              </TouchableOpacity>
            )}
            {/* A document has no thumbnail, so it gets a named chip instead of the
                image preview below. */}
            {selectedFile && !previewUrl ? (
              <View style={styles.docPreviewRow}>
                <FileText color={Colors.primary} size={18} />
                <Text style={styles.docPreviewName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <TouchableOpacity
                  onPress={() => { setSelectedFile(null); setPreviewUrl(""); }}
                  style={styles.docPreviewRemove}
                >
                  <Text style={{ color: "#fff", fontSize: 10 }}>×</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {previewUrl ? (
              <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
                <View style={{ position: "relative", width: 60, height: 60 }}>
                  <Image
                    source={{ uri: previewUrl }}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                    }}
                  />

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFile(null);
                      setPreviewUrl("");
                    }}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      backgroundColor: "red",
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Input */}

            { chatUserData?.friend?.isDeleted ? (
              <View style={{
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Text style={{
                  color: "#aaa",
                  fontSize: 13,
                  textAlign: "center"
                }}>
                  This user is no longer available
                </Text>
              </View>)
              // : isBlocked ? (
              //   <View style={{
              //     padding: 16,
              //     alignItems: "center",
              //     justifyContent: "center",
              //   }}>
              //     <Text style={{
              //       color: "#aaa",
              //       fontSize: 13,
              //       textAlign: "center"
              //     }}>
              //       You have blocked this user. Unblock to send messages.
              //     </Text>
              //   </View>)

               : isBlocked ? (
    <View
      style={{
        padding: 16,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isBlocker ? (
        <>
          <Text
            style={{
              color: "#f44336",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            You have blocked this user. Unblock to resume conversation.
          </Text>

          <TouchableOpacity
            style={{
              marginTop: 10,
              backgroundColor: "#22c55e",
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8,
            }}
            onPress={() => setUnblockDialogOpen(true)}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "600",
              }}
            >
              Unblock
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text
          style={{
            color: "#888",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          You cannot reply to this conversation anymore.
        </Text>
      )}
    </View>
  ) 
             : <View style={styles.inputBar}>
              <TouchableOpacity
                style={styles.inputIconBtn}
                onPress={() => {
                  // The panel and the keyboard compete for the same space.
                  if (!showEmoji) Keyboard.dismiss();
                  setShowEmoji((open) => !open);
                }}
              >
                <Smile color={showEmoji ? Colors.primary : Colors.gray500} size={22} />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                onFocus={() => setShowEmoji(false)}
                placeholder="Message..."
                placeholderTextColor={Colors.gray500}
                multiline
              />
              {text.trim() || selectedFile ? (
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                  {loading ? <ActivityIndicator color={"white"} /> : <Send color={Colors.white} size={20} />}
                </TouchableOpacity>
              ) : (
                <View style={styles.inputRightIcons}>
                  <TouchableOpacity style={styles.inputIconBtn} onPress={pickDocument}>
                    <Paperclip color={Colors.gray500} size={22} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputIconBtn} onPress={pickMedia}>
                    <ImageIcon color={Colors.gray500} size={22} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.micBtn}>
                    <Mic color={Colors.white} size={20} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
}

            {/* Emoji panel. Sits under the input bar so the message stays in
                view while picking. */}
            {showEmoji && (
              <View style={styles.emojiPanel}>
                <FlatList
                  data={EMOJI_GROUPS}
                  keyExtractor={(group) => group.label}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: group }) => (
                    <View>
                      <Text style={styles.emojiGroupLabel}>{group.label}</Text>
                      <View style={styles.emojiGrid}>
                        {group.emojis.map((emoji, index) => (
                          <TouchableOpacity
                            key={`${group.label}-${index}`}
                            style={styles.emojiCell}
                            onPress={() => addEmoji(emoji)}
                          >
                            <Text style={styles.emojiChar}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    gap: 4,
  },
  msgImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 6,
    resizeMode: 'cover',
  },
bubbleWrapper:{
  maxWidth:"72%",
},

bubbleWrapperSent:{
  alignItems:"flex-end",
},
  msgVideo: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 6,
  },
  dropdownMenu: {
    position: "absolute",
    top: 95,
    right: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    minWidth: 140,
    zIndex: 999,
    elevation: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageTouchSent:{
  maxWidth:"72%",
  alignSelf:"flex-end",
},

messageTouchReceived:{
  maxWidth:"72%",
  alignSelf:"flex-start",
},

  dropdownText: {
    color: Colors.gray700,
    fontSize: 14,
  },
  groupUserName: {
    width: 80,
    color: Colors.gray500,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  postContainer: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#fff",
  },

  videoPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 4,
  },

  videoText: {
    color: "#fff",
    fontSize: 12,
  },

  postTitle: {
    fontWeight: "600",
    fontSize: 14,
  },

  postDesc: {
    fontSize: 12,
    color: "#666",
  },
  backBtn: { padding: 8 },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
  },
  userStatus: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerIconBtn: { padding: 8 },
  /* Attached to both message lists. Without it the bubbles sat flat against
     the edges of the screen on both sides: this style was written but never
     given to a FlatList. Vertical spacing stays with msgRow. */
  msgList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  /* Emoji panel. A fixed height so opening it does not shove the
     conversation off the screen; it scrolls inside. */
  emojiPanel: {
    height: 260,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  emojiGroupLabel: {
    color: Colors.gray500,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emojiCell: {
    width: '12.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChar: { fontSize: 26 },

  /* The document waiting to be sent, and documents already in the thread. */
  docPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: Colors.gray50,
  },
  docPreviewName: {
    flex: 1,
    color: Colors.gray900,
    fontSize: Typography.fontSizes.sm,
  },
  docPreviewRemove: {
    backgroundColor: 'red',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: Colors.white,
  },
  docChipSent: { backgroundColor: 'rgba(255,255,255,0.18)' },
  docChipName: {
    flexShrink: 1,
    color: Colors.gray900,
    fontSize: Typography.fontSizes.sm,
    textDecorationLine: 'underline',
  },
  docChipNameSent: { color: Colors.white },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    gap: 6,
  },
  msgRowSent: { justifyContent: 'flex-end' },
  msgAvatarArea: { width: 32 },
  bubble: {
    maxWidth: '72%',
    borderRadius: 18,
    padding: 12,
    paddingBottom: 8,
  },
  bubbleReceived: {
    backgroundColor: Colors.gray50,
    borderBottomLeftRadius: 4,
  },
  bubbleSent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  msgText: {
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
    lineHeight: 20,
    marginBottom: 4,
  },
  msgTextSent: { color: Colors.white },
  msgTime: {
    color: Colors.gray500,
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  msgTimeSent: { color: 'rgba(255,255,255,0.65)' },
  imgBubble: {
    maxWidth: '72%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.gray50,
    borderBottomLeftRadius: 4,
  },
  imgBubbleSent: { borderBottomLeftRadius: 14, borderBottomRightRadius: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
  inputIconBtn: { padding: 6 },
  textInput: {
    flex: 1,
    color: Colors.gray900,
    fontSize: Typography.fontSizes.base,
    backgroundColor: Colors.gray50,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRightIcons: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
