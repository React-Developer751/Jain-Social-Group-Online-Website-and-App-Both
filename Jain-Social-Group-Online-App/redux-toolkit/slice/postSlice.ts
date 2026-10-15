import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Post } from "../../type";

interface PostState {
  postList: Post[];
  userPostList: Post[];
}

const initialState: PostState = {
  postList: [],
  userPostList: [],
};

const postSlice = createSlice({
  name: "Posts",
  initialState,
  reducers: {
    setPostList: (state, action: PayloadAction<Post[]>) => {
      state.postList = action.payload;
    },

    /** Appends the next page of the feed, skipping anything already held. */
    appendPostList: (state, action: PayloadAction<Post[]>) => {
      const seen = new Set(state.postList.map((p: any) => p?._id));
      for (const post of action.payload ?? []) {
        if (!seen.has((post as any)?._id)) state.postList.push(post);
      }
    },

    setUserPostList: (state, action: PayloadAction<Post[]>) => {
      state.userPostList = action.payload;
    },

   setPostLikeAnUnLike: (state, action) => {
  const { postId, userId } = action.payload;

  const item = state?.postList?.find((p) => p?._id === postId);

  if (item) {
    const alreadyLiked = item.likes.includes(userId);

    if (alreadyLiked) {
      item.likes = item.likes.filter((l) => l !== userId);
    } else {
      item.likes.push(userId);
    }
  }
},

     setPostComment: (state, action) => {
      const { postId, text, userId, fullName } = action.payload;
      const post = state.postList.find(p => p._id === postId);
      if (!post) return;

      const newComment = {
        _id: Date.now().toString(),
        text,
        createdAt: new Date().toISOString(),
        user: {
          user: userId,
          fullName: fullName
        },
      };

      if (!post.comments) post.comments = [];
      post.comments.push(newComment);
    },

    setPostLikeAnUnLikeComment: (state, action) => {
        const { postId, commentId, userId } = action.payload;
      const post = state.postList.find(p => p._id === postId);
      if (!post) return;
      const comment = post.comments.find(c => c._id === commentId);
      if (!comment) return;
      if (comment.likes.includes(userId)) {
        comment.likes = comment.likes.filter((l:string) => l !== userId);
      } else {
        comment.likes.push(userId);
      }
    },

    setPostReplyComment: (state, action) => {
      const { postId, commentId, text, userId, fullName } = action.payload;
      const post = state.postList.find(p => p._id === postId);
      if (!post) return;
      const comment = post.comments.find(c => c._id === commentId);
      if (!comment) return;
      const newReply = {
        _id: Date.now().toString(),
        text,
        createdAt: new Date().toISOString(),
        user: {
          user: userId,
          fullName: fullName
        },
      };
      if (!comment.replies) comment.replies = [];
      comment.replies.push(newReply);
    },

    setDeletePostFromList: (state, action: PayloadAction<{ postId: string; userId: string }>) => {
       const { postId, userId } = action.payload;

      const postIndex = state.postList.findIndex(
        (p) => p._id === postId && p.createdBy?._id === userId
      );

      if (postIndex !== -1) {
        state.postList.splice(postIndex, 1);
      }
    },
    /**
     * Removes a post from the feed regardless of who wrote it — used by
     * "Hide post" and after reporting content (App Store Guideline 1.2).
     */
    setHidePostFromList: (state, action: PayloadAction<{ postId: string }>) => {
      const { postId } = action.payload;
      state.postList = state.postList.filter((p) => p._id !== postId);
    },
    setRemoveUserPosts: (state, action) => {
      const userId = action.payload?._id;
      if (!userId) return;
      state.postList = state.postList.filter((post) => post?.createdBy?._id !== userId);
    },
     setNewPost: (state, action) => {
    const newPost = action.payload;

    const exists = state.postList.some( (post) => post?._id === newPost?._id);

    if (!exists) {
        state.postList.unshift(newPost);
    }
},
addOrUpdatePost: (state, action) => {
  const newPost = action.payload;

  const index = state.postList.findIndex(
    (post) => post._id === newPost._id
  );

  if (index !== -1) {
    // ✅ UPDATE existing post
    state.postList[index] = {
      ...state.postList[index],
      ...newPost,
    };
  } else {
    // ✅ ADD new post
    state.postList.unshift(newPost); // top pe add (feed style)
  }
}
  },
});

export const { appendPostList, 
  setPostList, 
  setUserPostList, 
  setNewPost,
  setPostLikeAnUnLike, 
  setPostComment, 
  setDeletePostFromList, 
  setPostLikeAnUnLikeComment, 
  setPostReplyComment ,
  setRemoveUserPosts,
  setHidePostFromList,
  addOrUpdatePost
} = postSlice.actions;

export default postSlice.reducer;

