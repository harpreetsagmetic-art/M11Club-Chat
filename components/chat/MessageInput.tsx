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
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 420.8 420.8"
            width="20"
            height="20"
          >
            <g>
              <path
                d="M406.8 96.4c-8.4-8.8-20-14-33.2-14h-66.4v-.8c0-10-4-19.6-10.8-26-6.8-6.8-16-10.8-26-10.8h-120c-10.4 0-19.6 4-26.4 10.8s-10.8 16-10.8 26v.8h-66c-13.2 0-24.8 5.2-33.2 14-8.4 8.4-14 20.4-14 33.2v199.2C0 342 5.2 353.6 14 362c8.4 8.4 20.4 14 33.2 14h326.4c13.2 0 24.8-5.2 33.2-14 8.4-8.4 14-20.4 14-33.2V129.6c0-13.2-5.2-24.8-14-33.2M400 328.8h-.4c0 7.2-2.8 13.6-7.6 18.4s-11.2 7.6-18.4 7.6H47.2c-7.2 0-13.6-2.8-18.4-7.6s-7.6-11.2-7.6-18.4V129.6c0-7.2 2.8-13.6 7.6-18.4s11.2-7.6 18.4-7.6h77.2c6 0 10.8-4.8 10.8-10.8V81.2c0-4.4 1.6-8.4 4.4-11.2s6.8-4.4 11.2-4.4h119.6c4.4 0 8.4 1.6 11.2 4.4s4.4 6.8 4.4 11.2v11.6c0 6 4.8 10.8 10.8 10.8H374c7.2 0 13.6 2.8 18.4 7.6s7.6 11.2 7.6 18.4z"
                fill="currentcolor"
              />

              <path
                d="M210.4 130.8c-27.2 0-52 11.2-69.6 28.8-18 18-28.8 42.4-28.8 69.6s11.2 52 28.8 69.6c18 18 42.4 28.8 69.6 28.8s52-11.2 69.6-28.8c18-18 28.8-42.4 28.8-69.6s-11.2-52-28.8-69.6-42.4-28.8-69.6-28.8M264.8 284c-14 13.6-33.2 22.4-54.4 22.4S170 297.6 156 284c-14-14-22.4-33.2-22.4-54.4s8.8-40.4 22.4-54.4c14-14 33.2-22.4 54.4-22.4s40.4 8.8 54.4 22.4c14 14 22.4 33.2 22.4 54.4.4 21.2-8.4 40.4-22.4 54.4"
                fill="currentcolor"
              />

              <circle cx="352.8" cy="150" r="19.6" fill="currentcolor" />
            </g>
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
