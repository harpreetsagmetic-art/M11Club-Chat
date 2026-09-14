import { Badge } from "@/components/ui/Badge";
import { cn, formatMessageTime } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

export function MessageBubble({
  message,
  isMine,
  canDelete,
  isDeleting,
  onDelete,
}: MessageBubbleProps) {
  return (
    <div className={cn("group flex", isMine ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[78%] flex-col", isMine ? "items-end" : "items-start")}>
        {!isMine && (
          <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-text-secondary">
            <span className="truncate">{message.senderName}</span>
            {message.senderRole === "admin" && <Badge>Admin</Badge>}
          </div>
        )}

        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
            isMine
              ? "rounded-br-sm bg-bubble-mine text-text-primary"
              : "rounded-bl-sm bg-bubble-other text-text-primary",
          )}
        >
          {message.text}
        </div>

        <div className="mt-1 flex items-center gap-1.5 px-1">
          <span className="text-[10px] text-text-muted">{formatMessageTime(message.createdAt)}</span>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              disabled={isDeleting}
              aria-label="Delete message"
              title="Delete message"
              className="flex h-5 w-5 items-center justify-center rounded-full text-text-muted opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 group-hover:opacity-100"
            >
              {isDeleting ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7h12Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}