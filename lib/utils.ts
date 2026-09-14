import type { Timestamp } from "firebase/firestore";

/** Joins class names, dropping falsy values. Kept dependency-free on purpose. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatMessageTime(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return "";

  try {
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
