import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import firebaseAdmin from "@/lib/firebase-admin";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Exchanges a one-time WordPress authentication code for a Firebase custom
 * token.
 *
 * Trust boundary: the browser only ever sends us the opaque, single-use
 * `code`. Every fact about *who* the user is (id, email, name, role) comes
 * from the server-to-server call to the WordPress REST API below — never
 * from anything the browser claims. This is what "don't trust user IDs or
 * emails coming from the browser" means in practice: there is no `email` or
 * `uid` field this endpoint will accept as input in the first place.
 */

function corsHeaders(origin: string | null) {
  const allowed = serverEnv.allowedEmbedOrigins;
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });

  if (origin && allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

const CODE_PATTERN = /^[a-fA-F0-9]{64}$/;

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  try {
    // 1. Basic abuse protection. The code itself is a 256-bit random,
    //    single-use, short-lived secret, so this isn't the primary defense —
    //    it just keeps someone from hammering the endpoint.
    const clientIp = getClientIp(request);
    const { allowed } = await rateLimit(`auth:${clientIp}`, 20, 60);

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again shortly." },
        { status: 429, headers: { ...Object.fromEntries(headers), "Retry-After": "60" } },
      );
    }

    // 2. Validate the shape of the code before touching WordPress or a DB.
    const body = await request.json().catch(() => null);
    const code = body?.code;

    if (typeof code !== "string" || !CODE_PATTERN.test(code)) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication code." },
        { status: 400, headers },
      );
    }

    // 3. Exchange the code with WordPress. This is the only source of truth
    //    for user identity — the browser's request body is never trusted.
    const wordpressResponse = await fetch(
      `${serverEnv.wordpressUrl}/wp-json/m11club/v1/exchange-auth-code`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        cache: "no-store",
      },
    );

    let wordpressData: any;
    try {
      wordpressData = await wordpressResponse.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "WordPress returned an invalid response." },
        { status: 502, headers },
      );
    }

    if (!wordpressResponse.ok || !wordpressData?.success) {
      return NextResponse.json(
        {
          success: false,
          error: wordpressData?.message || "WordPress authentication failed.",
        },
        { status: wordpressResponse.status || 401, headers },
      );
    }

    const user = wordpressData.user;

    if (!user?.id) {
      return NextResponse.json(
        { success: false, error: "WordPress user information is missing." },
        { status: 401, headers },
      );
    }

    // 4. Normalize trusted fields.
    const firstName = typeof user.firstName === "string" ? user.firstName.trim() : "";
    const lastName = typeof user.lastName === "string" ? user.lastName.trim() : "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") || user.name || user.email || "User";
    const role: "admin" | "user" = user.role === "admin" ? "admin" : "user";

    // Stable, deterministic Firebase UID derived from the WordPress user id.
    const firebaseUid = `wp_${user.id}`;
    const firebaseAuth = getAuth(firebaseAdmin);

    // 5. Create or update the mirrored Firebase user.
    try {
      await firebaseAuth.getUser(firebaseUid);
      await firebaseAuth.updateUser(firebaseUid, {
        email: user.email || undefined,
        displayName: fullName,
      });
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        await firebaseAuth.createUser({
          uid: firebaseUid,
          email: user.email || undefined,
          displayName: fullName,
        });
      } else {
        throw error;
      }
    }

    // 6. Custom claims are the trusted, tamper-proof channel for role/name
    //    info. They're embedded in every ID token the client gets afterwards
    //    and are verified server-side — the client can read them but not set
    //    or forge them.
    await firebaseAuth.setCustomUserClaims(firebaseUid, {
      wordpressUserId: String(user.id),
      firstName,
      lastName,
      fullName,
      role,
    });

    // 7. Mirror a profile document for convenience (admin dashboards, etc).
    const db = getFirestore(firebaseAdmin);
    await db
      .collection("users")
      .doc(firebaseUid)
      .set(
        {
          wordpressUserId: String(user.id),
          email: user.email || "",
          firstName,
          lastName,
          displayName: fullName,
          role,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    const firebaseToken = await firebaseAuth.createCustomToken(firebaseUid);

    return NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email, firstName, lastName, name: fullName, role },
        firebaseToken,
      },
      { status: 200, headers },
    );
  } catch (error) {
    console.error("WordPress -> Firebase authentication error:", error);

    return NextResponse.json(
      { success: false, error: "Authentication service temporarily unavailable." },
      { status: 500, headers },
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}
