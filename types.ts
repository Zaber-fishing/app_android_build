export interface Catch {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  fishType: string;
  length: number;
  weight: number;
  date: string;
  time: string;
  locationName: string;
  coordinates?: { lat: number; lng: number };
  isLocationPrivate?: boolean;
  bait?: string;
  method?: string;
  imageUrl?: string;
  likes: number;
  likes_uids?: string[];
  commentsCount: number;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  aiTrustScore?: number;
  aiAnalysisNote?: string;
  healthStatus?: 'healthy' | 'parasites' | 'injured' | 'invasive';
  isOfficialReport?: boolean;
  competitionId?: string;
  fraudScore?: number; 
  fraudReason?: string;
  isSuspicious?: boolean;
  temperature?: number;
  pressure?: number;
  windSpeed?: string;
  moonPhase?: string;
  waterClarity?: 'clear' | 'prikalena' | 'turbid' | 'muddy' | 'algae';
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  catchCount: number;
  ecoPoints: number;
  isFollowing: boolean;
  status: 'online' | 'offline';
  location?: string;
  bio?: string;
  membershipId?: string;
  licenseExpiry?: string;
  isAdmin?: boolean;
  email?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'catch' | 'comment' | 'like' | 'record' | 'eco' | 'system';
  timestamp: string;
  isRead: boolean;
  relatedId?: string;
  senderAvatar?: string;
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  isRead?: boolean;
}

export enum NavigationTab {
  Landing = 'Landing',
  Home = 'Home',
  Catches = 'Catches',
  Add = 'Add',
  Rankings = 'Rankings',
  Community = 'Community',
  Profile = 'Profile',
  Chat = 'Chat',
  AI = 'AI',
  Notifications = 'Notifications',
  EcoMap = 'EcoMap',
  Admin = 'Admin',
  Legislation = 'Legislation',
  FAQs = 'FAQs',
  Updates = 'Updates'
}

export type ViewState = {
  tab: NavigationTab;
  detailCatchId?: string;
  detailCompetitionId?: string;
  activeChatUserId?: string;
  viewingUserId?: string;
  isLoggedIn: boolean;
};

export interface EcoReport {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  missionId: string;
  missionTitle: string;
  type: 'pollution' | 'algae' | 'cleanup' | 'invasive' | 'other';
  status: 'pending' | 'verified' | 'rejected';
  description: string;
  coordinates: { lat: number; lng: number };
  timestamp: any;
  imageUrl?: string;
  rewardValue: number;
  aiVerification?: {
    verified: boolean;
    confidence: number;
    comment: string;
  };
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  location: string;
  targetFish: string;
  startDate: string;
  endDate: string;
  prize: string;
  scoringRule: 'combined' | 'weight' | 'length' | 'eco';
}

export interface FriendRequest {
  id: string;
  fromUser: User;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  adminResponse?: string;
}

export interface AiAdvice {
  text?: string;
  sources?: { title: string; uri: string }[];
  species?: string;
  healthStatus?: string;
  diagnostic?: string;
  recommendation?: string;
}