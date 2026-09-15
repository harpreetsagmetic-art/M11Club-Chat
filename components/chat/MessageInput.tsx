"use client";

import type { KeyboardEvent } from "react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  sending: boolean;
  cooldown: boolean;
}

const MAX_LENGTH = 2000;

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  sending,
  cooldown,
}: MessageInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  const sendDisabled = disabled || sending || cooldown || !value.trim();

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-3">
      <button
        type="button"

        aria-label="Attachments (coming soon)"
        title="Attachments coming soon"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-muted"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19l-9.2 9.19a1.83 1.83 0 0 1-2.59-2.59l8.49-8.48"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write now…"
        maxLength={MAX_LENGTH}
        disabled={disabled || sending}
        className="min-w-0 flex-1 rounded-full border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent disabled:opacity-60"
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={sendDisabled}
        aria-label="Send message"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-text-muted"
      >
        {sending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12 20 4l-6 16-3-7-7-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}