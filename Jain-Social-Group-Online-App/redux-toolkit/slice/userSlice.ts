import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../../type";

// 1. STATE TYPE DEFINE KARO
interface UserState {
  userList: User[];
  userCount: number;
  userData: any | null;
}

// 2. INITIAL STATE WITH TYPE
const initialState: UserState = {
  userList: [],
  userCount: 0,
  userData: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUserList: (state, action: PayloadAction<User[]>) => {
      state.userList = action.payload;
    },

    setUserCount: (state, action: PayloadAction<number>) => {
      state.userCount = action.payload;
    },

     setUpdateUserFromList: (state, action) => {
    // If user exists, remove them; otherwise, add them to the array
    state.userList = state.userList.some(user => user._id === action.payload.userId)
        ? state.userList.filter(user => user._id !== action.payload.userId)
        : [...state.userList, action.payload?.user];
},

    setUserData: (state, action: PayloadAction<any>) => {
      state.userData = action.payload;
    },

    setUpdateUser: (state, action: PayloadAction<User>) => {
      if (state.userData?._id === action.payload?._id) {
        state.userData = action.payload;
      }
    },
    setRemoveUser: (state, action) => {
      state.userList = state.userList.filter((u) => u?._id !== (action.payload?._id || action.payload))
    },

    setRecoverUser: (state, action) => {
      const exists = state.userList.some((u) => u._id === action.payload._id);

      if (!exists) {
        state.userList.push(action.payload);
      }
    }
  },
});

export const { setUserList,setUpdateUserFromList, setRemoveUser, setRecoverUser, setUserCount, setUserData, setUpdateUser } = userSlice.actions;
export default userSlice.reducer;