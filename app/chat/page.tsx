"use client";

import { useEffect, useRef, useState } from "react";
import { signInWithCustomToken } from "firebase/auth";
import {
  addDoc,
  collection,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase-client";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: any;
};

export default function ChatPage() {
  const [authenticated, setAuthenticated] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);

  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);

  const [status, setStatus] = useState("Connecting...");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);


  // =========================================================
  // 1. WORDPRESS → NEXT.JS → FIREBASE LOGIN
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function authenticate() {
      try {
        setStatus("Connecting...");

        const params = new URLSearchParams(window.location.search);

        const code = params.get("code");

        if (!code) {
          throw new Error(
            "Authentication code is missing."
          );
        }


        // -----------------------------------------------------
        // Send one-time WordPress code to Next.js server
        // -----------------------------------------------------

        const response = await fetch(
          "/api/auth/wordpress",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              code,
            }),
          }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {
          throw new Error(
            data?.error ||
            "Authentication failed."
          );
        }


        if (!data.firebaseToken) {
          throw new Error(
            "Firebase authentication token is missing."
          );
        }


        // -----------------------------------------------------
        // Sign into Firebase
        // -----------------------------------------------------

        const result =
          await signInWithCustomToken(
            auth,
            data.firebaseToken
          );


        if (cancelled) {
          return;
        }


        // -----------------------------------------------------
        // Use name received from trusted WordPress response
        // -----------------------------------------------------

        const firstName =
          typeof data.user?.firstName === "string"
            ? data.user.firstName.trim()
            : "";

        const lastName =
          typeof data.user?.lastName === "string"
            ? data.user.lastName.trim()
            : "";

        const fullName =
          [firstName, lastName]
            .filter(Boolean)
            .join(" ") ||
          data.user?.name ||
          data.user?.email ||
          "User";


        // -----------------------------------------------------
        // Keep Firebase client user display name synchronized
        // -----------------------------------------------------

        if (result.user.displayName !== fullName) {
          try {
            const { updateProfile } =
              await import("firebase/auth");

            await updateProfile(
              result.user,
              {
                displayName: fullName,
              }
            );
          } catch (error) {
            console.error(
              "Unable to update display name:",
              error
            );
          }
        }


        // -----------------------------------------------------
        // Remove authentication code from URL
        // -----------------------------------------------------

        window.history.replaceState(
          {},
          "",
          "/chat"
        );


        setAuthenticated(true);

        setStatus("");

      } catch (error) {
        console.error(
          "Authentication error:",
          error
        );

        if (!cancelled) {
          setAuthenticated(false);

          setStatus(
            error instanceof Error
              ? error.message
              : "Unable to connect to chat."
          );
        }
      }
    }


    authenticate();


    return () => {
      cancelled = true;
    };
  }, []);


  // =========================================================
  // 2. REALTIME FIRESTORE MESSAGES
  // =========================================================

  useEffect(() => {
    if (!authenticated) {
      return;
    }


    const messagesRef = collection(
      db,
      "groups",
      "mainGroup",
      "messages"
    );


    const messagesQuery = query(
      messagesRef,
      orderBy("createdAt", "asc"),
      limitToLast(100)
    );


    const unsubscribe = onSnapshot(
      messagesQuery,

      (snapshot) => {
        const newMessages: Message[] =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<
              Message,
              "id"
            >),
          }));


        setMessages(newMessages);
      },

      (error) => {
        console.error(
          "Firestore error:",
          error
        );

        setStatus(
          "Unable to load messages."
        );
      }
    );


    return () => {
      unsubscribe();
    };
  }, [authenticated]);


  // =========================================================
  // 3. AUTO SCROLL
  // =========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  // =========================================================
  // 4. SEND MESSAGE
  // =========================================================

  async function sendMessage() {
    const text = message.trim();

    if (!text) {
      return;
    }


    if (sending) {
      return;
    }


    const user = auth.currentUser;

    if (!user) {
      setStatus(
        "You are not authenticated."
      );

      return;
    }


    // -------------------------------------------------------
    // Get trusted Firebase display name
    // -------------------------------------------------------

    const senderName =
      user.displayName ||
      "User";


    try {
      setSending(true);

      setStatus("");


      await addDoc(
        collection(
          db,
          "groups",
          "mainGroup",
          "messages"
        ),
        {
          senderId: user.uid,

          senderName,

          text,

          createdAt:
            serverTimestamp(),
        }
      );


      setMessage("");

    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      setStatus(
        "Unable to send message."
      );

    } finally {
      setSending(false);
    }
  }


  // =========================================================
  // 5. ENTER KEY
  // =========================================================

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();

      sendMessage();
    }
  }


  // =========================================================
  // 6. FORMAT TIME
  // =========================================================

  function formatTime(
    timestamp: any
  ) {
    if (!timestamp) {
      return "";
    }


    try {
      const date =
        timestamp.toDate
          ? timestamp.toDate()
          : new Date(timestamp);


      return date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    } catch {
      return "";
    }
  }


  // =========================================================
  // 7. LOADING / AUTH ERROR
  // =========================================================

  if (!authenticated) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#555",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              marginBottom: "8px",
            }}
          >
            {status}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#888",
            }}
          >
            Please wait...
          </div>
        </div>
      </main>
    );
  }


  // =========================================================
  // 8. CHAT UI
  // =========================================================

  const currentUser = auth.currentUser;

  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f5f5",
        fontFamily:
          "Arial, sans-serif",
      }}
    >

      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <header
        style={{
          background: "#111827",
          color: "#ffffff",
          padding: "14px 16px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
          }}
        >
          M11Club Chat
        </div>

        <div
          style={{
            fontSize: "12px",
            opacity: 0.75,
            marginTop: "3px",
          }}
        >
          {currentUser?.displayName ||
            currentUser?.email ||
            "User"}
        </div>
      </header>


      {/* ================================================= */}
      {/* MESSAGES */}
      {/* ================================================= */}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >

        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "#888",
              fontSize: "14px",
              marginTop: "30px",
            }}
          >
            No messages yet.
          </div>
        )}


        {messages.map((item) => {

          const isMine =
            item.senderId ===
            currentUser?.uid;


          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: isMine
                  ? "flex-end"
                  : "flex-start",
                marginBottom: "10px",
              }}
            >

              <div
                style={{
                  maxWidth: "80%",
                }}
              >

                {!isMine && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#666",
                      marginBottom: "3px",
                      paddingLeft: "4px",
                    }}
                  >
                    {item.senderName}
                  </div>
                )}


                <div
                  style={{
                    background: isMine
                      ? "#111827"
                      : "#ffffff",

                    color: isMine
                      ? "#ffffff"
                      : "#222",

                    padding:
                      "9px 12px",

                    borderRadius:
                      "12px",

                    fontSize: "14px",

                    lineHeight: "1.4",

                    wordBreak:
                      "break-word",

                    boxShadow:
                      "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                >
                  {item.text}
                </div>


                <div
                  style={{
                    fontSize: "10px",
                    color: "#999",
                    marginTop: "3px",
                    textAlign: isMine
                      ? "right"
                      : "left",
                    padding:
                      "0 4px",
                  }}
                >
                  {formatTime(
                    item.createdAt
                  )}
                </div>

              </div>
            </div>
          );
        })}


        <div ref={messagesEndRef} />

      </div>


      {/* ================================================= */}
      {/* ERROR / STATUS */}
      {/* ================================================= */}

      {status && (
        <div
          style={{
            padding:
              "6px 12px",
            fontSize: "12px",
            color: "#b91c1c",
            background: "#fef2f2",
            flexShrink: 0,
          }}
        >
          {status}
        </div>
      )}


      {/* ================================================= */}
      {/* MESSAGE INPUT */}
      {/* ================================================= */}

      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "10px",
          background: "#ffffff",
          borderTop:
            "1px solid #e5e7eb",
          flexShrink: 0,
        }}
      >

        <input
          type="text"
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value
            )
          }
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={2000}
          disabled={sending}
          style={{
            flex: 1,
            border:
              "1px solid #d1d5db",
            borderRadius: "8px",
            padding:
              "10px 12px",
            fontSize: "14px",
            outline: "none",
          }}
        />


        <button
          type="button"
          onClick={sendMessage}
          disabled={
            sending ||
            !message.trim()
          }
          style={{
            border: "none",
            borderRadius: "8px",
            padding:
              "0 16px",
            background:
              "#111827",
            color: "#ffffff",
            cursor:
              sending ||
              !message.trim()
                ? "not-allowed"
                : "pointer",
            opacity:
              sending ||
              !message.trim()
                ? 0.5
                : 1,
          }}
        >
          {sending
            ? "..."
            : "Send"}
        </button>

      </div>

    </main>
  );
}