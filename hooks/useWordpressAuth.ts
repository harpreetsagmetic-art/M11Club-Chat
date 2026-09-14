"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signInWithCustomToken, updateProfile } from "firebase/auth";

import { auth, authReady } from "@/lib/firebase-client";
import type { ChatUser, WordpressAuthResponse } from "@/types/chat";

type AuthState =
  | { status: "connecting" }
  | { status: "ready"; user: ChatUser }
  | { status: "error"; message: string };

/**
 * Drives sign-in for the embedded chat: ?code=... -> POST /api/auth/wordpress
 * -> signInWithCustomToken. The code is single-use, so at most one request may
 * fire per attempt. startedAttempts blocks React Strict Mode's duplicate
 * effect invocation from sending a second request. latestAttempt guards
 * setState against a stale response from an older attempt after retry() —
 * it is intentionally not tied to effect cleanup, since React 18 does not
 * require that, and tying it to cleanup previously caused the real response
 * to be dropped during Strict Mode's mount/cleanup/mount cycle, freezing the
 * UI on "Connecting...".
 */
export function useWordpressAuth() {
  const [state, setState] = useState<AuthState>({ status: "connecting" });
  const [attempt, setAttempt] = useState(0);
  const startedAttempts = useRef<Set<number>>(new Set());
  const latestAttempt = useRef(0);

  const retry = useCallback(() => {
    setState({ status: "connecting" });
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (startedAttempts.current.has(attempt)) {
      return;
    }
    startedAttempts.current.add(attempt);
    latestAttempt.current = attempt;

    async function authenticate() {
      try {
        setState({ status: "connecting" });

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
          throw new Error("Authentication code is missing.");
        }

        const response = await fetch("/api/auth/wordpress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data: WordpressAuthResponse = await response.json();

        if (!response.ok || !data.success || !data.firebaseToken || !data.user) {
          throw new Error(data?.error || "Authentication failed.");
        }

        await authReady;
        const result = await signInWithCustomToken(auth, data.firebaseToken);

        if (latestAttempt.current !== attempt) return;

        const tokenResult = await result.user.getIdTokenResult();
        const role = tokenResult.claims.role === "admin" ? "admin" : "user";

        const firstName = data.user.firstName?.trim() || "";
        const lastName = data.user.lastName?.trim() || "";
        const fullName =
          [firstName, lastName].filter(Boolean).join(" ") ||
          data.user.name ||
          data.user.email ||
          "User";

        if (result.user.displayName !== fullName) {
          try {
            await updateProfile(result.user, { displayName: fullName });
          } catch (error) {
            console.error("Unable to update display name:", error);
          }
        }

        // Strip the one-time code from the URL so it can't be replayed via history.
        window.history.replaceState({}, "", "/chat");

        if (latestAttempt.current !== attempt) return;

        setState({
          status: "ready",
          user: { uid: result.user.uid, displayName: fullName, email: data.user.email, role },
        });
      } catch (error) {
        if (latestAttempt.current !== attempt) return;

        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to connect to chat.",
        });
      }
    }

    authenticate();
  }, [attempt]);

  return { state, retry };
}