"use client";

import { useEffect, useState } from "react";
import { collection, limitToLast, onSnapshot, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase-client";
import { publicEnv } from "@/lib/env";
import type { ChatMessage } from "@/types/chat";

const MESSAGE_LIMIT = 100;

type MessagesState =
  | { status: "loading" }
  | { status: "ready"; messages: ChatMessage[] }
  | { status: "error"; message: string };

/**
 * Reads are done directly against Firestore from the client (not through an
 * API route) because they're realtime and per-user access is already
 * enforced by Firestore Security Rules (`allow read: if isSignedIn()`).
 * Writes are deliberately NOT done this way — see /api/chat/message.
 */
export function useChatMessages(enabled: boolean) {
  const [state, setState] = useState<MessagesState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setState({ status: "loading" });

    const messagesRef = collection(db, "groups", publicEnv.chatGroupId, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"), limitToLast(MESSAGE_LIMIT));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((messageDoc) => ({
          id: messageDoc.id,
          ...(messageDoc.data() as Omit<ChatMessage, "id">),
        }));

        setState({ status: "ready", messages });
      },
      (error) => {
        console.error("Firestore error:", error);
        setState({ status: "error", message: "Unable to load messages right now." });
      },
    );

    return () => unsubscribe();
  }, [enabled]);

  return state;
}
