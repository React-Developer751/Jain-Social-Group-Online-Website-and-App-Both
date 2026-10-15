import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {Announcement} from "@/type/index";

interface AnnouncementData {
  announcementList : Announcement[]
}

const initialState: AnnouncementData = {
  announcementList : []
};


const announcementSlice = createSlice({
    name:"Announcement",
    initialState,
    reducers:{
        setAnnouncementList : (state, action:PayloadAction<any[]>) => {
          state.announcementList = action.payload;
        },

        setNewAnnouncement : (state, action:PayloadAction<any>) => {
           state.announcementList.push(action?.payload);
        }
    }
});

export const {setAnnouncementList, setNewAnnouncement} = announcementSlice.actions;

export default announcementSlice.reducer;

