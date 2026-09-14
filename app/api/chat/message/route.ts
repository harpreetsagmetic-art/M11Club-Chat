import { NextRequest, NextResponse } from "next/server";

import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

import { Redis } from "@upstash/redis";

import firebaseAdmin from "@/lib/firebase-admin";


// =========================================================
// UPSTASH
// =========================================================

const redis = Redis.fromEnv();


// =========================================================
// POST
// =========================================================

export async function POST(
  request: NextRequest
) {
  try {

    // -------------------------------------------------------
    // 1. Get Firebase ID token
    // -------------------------------------------------------

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const idToken =
      authorization.substring(7);


    // -------------------------------------------------------
    // 2. Verify Firebase token
    // -------------------------------------------------------

    const firebaseAuth =
      getAuth(firebaseAdmin);

    const decodedToken =
      await firebaseAuth.verifyIdToken(
        idToken
      );


    // -------------------------------------------------------
    // 3. Rate limit by Firebase UID
    // -------------------------------------------------------

    const rateLimitKey =
      `m11club:messages:${decodedToken.uid}`;

    const messageCount =
      await redis.incr(
        rateLimitKey
      );

    if (messageCount === 1) {
      await redis.expire(
        rateLimitKey,
        60
      );
    }

    if (messageCount > 10) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are sending messages too quickly. Please wait a minute.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }


    // -------------------------------------------------------
    // 4. Get message
    // -------------------------------------------------------

    const body =
      await request.json();

    const text =
      typeof body?.text === "string"
        ? body.text.trim()
        : "";


    // -------------------------------------------------------
    // 5. Validate message
    // -------------------------------------------------------

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: "Message cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Message is too long.",
        },
        { status: 400 }
      );
    }


    // -------------------------------------------------------
    // 6. Get trusted user information
    // -------------------------------------------------------

    const senderId =
      decodedToken.uid;

    const senderName =
      typeof decodedToken.fullName === "string" &&
      decodedToken.fullName.trim()
        ? decodedToken.fullName.trim()
        : decodedToken.name ||
          decodedToken.email ||
          "User";


    const senderRole =
      decodedToken.role === "admin"
        ? "admin"
        : "user";


    // -------------------------------------------------------
    // 7. Save message to Firestore
    // -------------------------------------------------------

    const db =
      getFirestore(firebaseAdmin);

    const messageRef =
      await db
        .collection("groups")
        .doc("mainGroup")
        .collection("messages")
        .add({
          senderId,
          senderName,
          senderRole,
          text,
          createdAt:
            FieldValue.serverTimestamp(),
        });


    // -------------------------------------------------------
    // 8. Success
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        messageId: messageRef.id,
      },
      { status: 200 }
    );

  } catch (error) {

    console.error(
      "Send message API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to send message.",
      },
      { status: 500 }
    );
  }
}