import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import firebaseAdmin from "@/lib/firebase-admin";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_PER_MINUTE = 10;

export async function POST(request: NextRequest) {
  try {
    // 1. Require and verify a Firebase ID token. This is the only source of
    //    truth for who the sender is — the request body never carries an id.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      );
    }

    const idToken = authorization.slice(7);
    const firebaseAuth = getAuth(firebaseAdmin);

    let decodedToken;
    try {
      decodedToken = await firebaseAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please reopen the chat." },
        { status: 401 },
      );
    }

    // 2. Per-user rate limit.
    const { allowed } = await rateLimit(
      `messages:${decodedToken.uid}`,
      MAX_MESSAGES_PER_MINUTE,
      60,
    );

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "You are sending messages too quickly. Please wait a minute.",
        },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // 3. Validate the message body.
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Message cannot be empty." },
        { status: 400 },
      );
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, error: "Message is too long." },
        { status: 400 },
      );
    }

    // 4. Sender identity comes from the verified token's custom claims —
    //    never from the request body — so a client can't spoof their name
    //    or role by editing local JS state.
    const senderId = decodedToken.uid;
    const senderName =
      (typeof decodedToken.fullName === "string" && decodedToken.fullName.trim()) ||
      decodedToken.name ||
      decodedToken.email ||
      "User";
    const senderRole = decodedToken.role === "admin" ? "admin" : "user";

    const db = getFirestore(firebaseAdmin);
    const messageRef = await db
      .collection("groups")
      .doc(serverEnv.chatGroupId)
      .collection("messages")
      .add({
        senderId,
        senderName,
        senderRole,
        text,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true, messageId: messageRef.id }, { status: 200 });
  } catch (error) {
    console.error("Send message API error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to send message." },
      { status: 500 },
    );
  }
}
