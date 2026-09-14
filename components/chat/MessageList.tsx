"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import { EmptyState } from "@/components/chat/EmptyState";
import { ErrorState } from "@/components/chat/ErrorState";
import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  messages: ChatMessage[];
  currentUserId: string;
  isAdmin: boolean;
  deletingMessageId: string | null;
  onDeleteMessage: (id: string) => void;
}

export function MessageList({
  status,
  errorMessage,
  messages,
  currentUserId,
  isAdmin,
  deletingMessageId,
  onDeleteMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (status === "loading") {
    return <MessageListSkeleton />;
  }

  if (status === "error") {
    return <ErrorState message={errorMessage || "Unable to load messages."} />;
  }

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isMine={message.senderId === currentUserId}
          canDelete={isAdmin}
          isDeleting={deletingMessageId === message.id}
          onDelete={onDeleteMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
