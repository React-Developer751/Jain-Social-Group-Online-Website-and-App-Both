export interface User {
    _id: string;
    userId: string;
    fullName: string;
    email: string;
    mobile: string;
    dob: string;
    occupation: string;
    gender: string;
    maritalStatus: string;
    city: string;
    address: string;
    state: string;
    role: string;
    blocked: boolean;
    profileImage: string;
    coverImage: string;
    friends: any[];
    password: string;
    isVerified: boolean;
    accountType: string;
    isOnline: boolean;
    lastSeen: string;
    premiumUser: any | null;
    children: any[];
    businesses: any[];
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export interface Post {
    _id: string;
    title?: string;
    description: string;
    images: string[];
    createdBy: User;
    create: string;
    type: string;
    likes: string[];
    comments: any[];
    createdAt: string;
    updatedAt: string;
    important?: boolean;
    notes?: string;
    isPinned?: boolean;
};


export interface Group {
    _id : string;
    title : string;
    description :string;
    images : any[];
    members : any[];
    createdBy : string;
    createdAt : string;
    updatedAt : string;
};



export interface Announcement {
    _id : string;
    title:string;
    description : string;
    priority: string;
    createdBy:any;
    createdAt:string;
    updatedAt :string;
};
