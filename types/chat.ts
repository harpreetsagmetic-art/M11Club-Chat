import type { Timestamp } from "firebase/firestore";

export type ChatRole = "admin" | "user";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: ChatRole;
  text: string;
  createdAt: Timestamp | null;
}

export interface ChatUser {
  uid: string;
  displayName: string;
  email: string | null;
  role: ChatRole;
}

/** Trusted user fields returned by our own /api/auth/wordpress route. */
export interface WordpressAuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: ChatRole;
}

export interface WordpressAuthResponse {
  success: boolean;
  error?: string;
  user?: WordpressAuthUser;
  firebaseToken?: string;
}
