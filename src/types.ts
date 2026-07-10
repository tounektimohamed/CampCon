export interface CampSettings {
  photoAlbumUrl: string;
  dailyProgram: string;
  dietaryMenu: string;
  activities: string;
}

export interface UserProfile {
  id: string; // parentname_childname
  parentName: string;
  childName: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: number;
}

export interface CampNotification {
  id: string;
  title: string;
  body: string;
  createdAt: number; // millisecond timestamp
}

export interface Comment {
  id: string;
  parentName: string;
  childName: string; // empty if admin
  text: string;
  isPrivate: boolean;
  createdAt: number;
}

export interface AlbumPost {
  id: string;
  albumName: string;
  albumUrl: string;
  createdAt: number;
  comments: Comment[];
}
