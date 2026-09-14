"use client";

import { useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase-client";
import { publicEnv } from "@/lib/env";
import { useWordpressAuth } from "@/hooks/useWordpressAuth";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import { ConnectingScreen } from "@/components/chat/ConnectingScreen";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { OfflineBanner } from "@/components/chat/OfflineBanner";
import { InlineNotice } from "@/components/chat/InlineNotice";

export default function ChatPage() {
  const { state: authState, retry } = useWordpressAuth();
  const isOnline = useOnlineStatus();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const authenticated = authState.status === "ready";
  const messagesState = useChatMessages(authenticated);

  if (authState.status !== "ready") {
    return (
      <ConnectingScreen
        status={authState.status}
        errorMessage={authState.status === "error" ? authState.message : undefined}
        onRetry={retry}
      />
    );
  }

  const user = authState.user;

  // Messages are written through /api/chat/message (Firebase Admin SDK on
  // the server), never with a direct client-side `addDoc`. That route
  // verifies the sender's ID token, rate-limits, and validates length
  // server-side — logic a modified client can't bypass. Firestore rules
  // also deny client `create` on this collection as defense in depth.
  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending || cooldown) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setNotice("You are not authenticated.");
      return;
    }

    try {
      setSending(true);
      setNotice("");

      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Unable to send message.");
      }

      setDraft("");
      setCooldown(true);
      setTimeout(() => setCooldown(false), 1000);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  // Deletes go straight to Firestore from the client, but Firestore Security
  // Rules (see firestore.rules) are the actual gate — only a token with the
  // `admin` custom claim can delete. The `isAdmin` check here is just UX.
  async function deleteMessage(messageId: string) {
    if (user.role !== "admin" || deletingMessageId) return;
    if (!window.confirm("Delete this message?")) return;

    try {
      setDeletingMessageId(messageId);
      setNotice("");
      await deleteDoc(doc(db, "groups", publicEnv.chatGroupId, "messages", messageId));
    } catch (error) {
      console.error("Delete message error:", error);
      setNotice("Unable to delete message.");
    } finally {
      setDeletingMessageId(null);
    }
  }

  return (
    <main className="app-gradient-bg flex h-dvh flex-col">
      <ChatHeader user={user} />

      {!isOnline && <OfflineBanner />}

      <MessageList
        status={messagesState.status}
        errorMessage={messagesState.status === "error" ? messagesState.message : undefined}
        messages={messagesState.status === "ready" ? messagesState.messages : []}
        currentUserId={user.uid}
        isAdmin={user.role === "admin"}
        deletingMessageId={deletingMessageId}
        onDeleteMessage={deleteMessage}
      />

      {notice && <InlineNotice message={notice} />}

      <MessageInput
        value={draft}
        onChange={setDraft}
        onSubmit={sendMessage}
        disabled={!isOnline}
        sending={sending}
        cooldown={cooldown}
      />
    </main>
  );
}