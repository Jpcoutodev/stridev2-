export interface CommentModel {
  id: string;
  userId: string; // Added to identify commenter
  username: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export interface PostModel {
  id: string;
  userId: string; // Added to identify post owner
  type: 'image' | 'measurement' | 'text' | 'workout';
  username: string;
  userAvatar: string;
  date: string; // ISO 8601 Date String
  clapCount: number;
  caption: string;

  // Optional content fields
  imageUrl?: string;
  weight?: number;
  measurements?: string;
  workoutItems?: { activity: string; detail: string }[];

  // Interaction
  comments?: CommentModel[];
  isPrivate?: boolean;

  // Shared/Repost
  sharedPostId?: string;
  originalPost?: PostModel; // The original post data if this is a share
  sharedByUsername?: string; // Username of person who shared (for display)
  sharedByAvatar?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  posts: number;
  isFollowing: boolean;
  isPrivate: boolean;
  hasNewStory: boolean; // New field to prioritize in stories bar
  postsList: PostModel[];
}