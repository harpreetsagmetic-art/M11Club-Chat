"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  sending: boolean;
  cooldown: boolean;
}

const MAX_LENGTH = 2000;
const MAX_IMAGES = 10;

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled,
  sending,
  cooldown,
}: MessageInputProps) {
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handleAttachmentClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    const remainingSlots = MAX_IMAGES - images.length;

    const selectedFiles = imageFiles.slice(0, remainingSlots);

    const imageUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    setImages((prev) => [...prev, ...imageUrls]);

    // Allows selecting the same file again later
    event.target.value = "";
  }

  function handleRemoveImage(index: number) {
    setImages((prev) => {
      const updatedImages = [...prev];

      URL.revokeObjectURL(updatedImages[index]);

      updatedImages.splice(index, 1);

      return updatedImages;
    });
  }

  const sendDisabled = disabled || sending || cooldown || !value.trim();

  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      {/* Uploaded images */}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-[10px]">
          {images.map((image, index) => (
            <div
              key={image}
              className="relative h-20  w-[calc((100%-30px)/4)] overflow-hidden rounded-lg border border-border"
            >
              <img
                src={image}
                alt={`Uploaded image ${index + 1}`}
                className="h-full w-full object-cover"
              />

              {/* Remove image */}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-xs text-white"
                aria-label={`Remove image ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Message input */}
      <div className="flex items-center gap-2">
        {/* Attachment button */}
        <button
          type="button"
          aria-label="Upload images"
          title="Upload images"
          onClick={handleAttachmentClick}
          disabled={disabled || sending || images.length >= MAX_IMAGES}
          className="attchment-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19l-9.2 9.19a1.83 1.83 0 0 1-2.59-2.59l8.49-8.48"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Message input */}
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

        {/* Send button */}
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
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 12 20 4l-6 16-3-7-7-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
