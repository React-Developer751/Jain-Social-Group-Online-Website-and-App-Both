import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    blockList : []
}

const blockSlice = createSlice({
    name : "Block User",
    initialState,
    reducers : {
      setBlockList : (state, action) => {
        state.blockList = action.payload;
      },

      setUnBlock : (state, action) => {
        state.blockList = state.blockList.filter((block:any) => block?.blockedId?._id !== action.payload?.toId);

      }
    }
});

export const {setBlockList, setUnBlock} = blockSlice.actions;

export default blockSlice.reducer;