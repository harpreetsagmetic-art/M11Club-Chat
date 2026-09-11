import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import firebaseAdmin from "@/lib/firebase-admin";

const WORDPRESS_URL = "https://m11club.com.au";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://m11club.com.au",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------
    // 1. Get authentication code from browser
    // -----------------------------------------

    const body = await request.json();
    const code = body?.code;

    if (
      typeof code !== "string" ||
      code.length !== 64 ||
      !/^[a-fA-F0-9]+$/.test(code)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid authentication code.",
        },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // -----------------------------------------
    // 2. Exchange code with WordPress
    // -----------------------------------------

    const wordpressResponse = await fetch(
      `${WORDPRESS_URL}/wp-json/m11club/v1/exchange-auth-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
        }),
        cache: "no-store",
      }
    );

    let wordpressData;

    try {
      wordpressData = await wordpressResponse.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "WordPress returned an invalid response.",
        },
        {
          status: 502,
          headers: corsHeaders(),
        }
      );
    }

    // -----------------------------------------
    // 3. Check WordPress response
    // -----------------------------------------

    if (!wordpressResponse.ok || !wordpressData?.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            wordpressData?.message ||
            "WordPress authentication failed.",
        },
        {
          status: wordpressResponse.status || 401,
          headers: corsHeaders(),
        }
      );
    }

    const user = wordpressData.user;

    if (!user || !user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "WordPress user information is missing.",
        },
        {
          status: 401,
          headers: corsHeaders(),
        }
      );
    }

    // -----------------------------------------
    // 4. Get user's name
    // -----------------------------------------

    const firstName =
      typeof user.firstName === "string"
        ? user.firstName.trim()
        : "";

    const lastName =
      typeof user.lastName === "string"
        ? user.lastName.trim()
        : "";

    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") ||
      user.name ||
      user.email ||
      "User";

    // -----------------------------------------
    // 5. Get user's role
    //
    // Only "admin" or "user" is allowed.
    // -----------------------------------------

    const role = user.role === "admin" ? "admin" : "user";

    // -----------------------------------------
    // 6. Stable Firebase UID
    //
    // Example:
    // WordPress user ID = 169
    // Firebase UID = wp_169
    // -----------------------------------------

    const firebaseUid = `wp_${user.id}`;

    const firebaseAuth = getAuth(firebaseAdmin);

    // -----------------------------------------
    // 7. Create or update Firebase user
    // -----------------------------------------

    try {
      // Check if Firebase user already exists
      await firebaseAuth.getUser(firebaseUid);

      // User exists → update information
      await firebaseAuth.updateUser(firebaseUid, {
        email: user.email || undefined,
        displayName: fullName,
      });
    } catch (error: any) {
      if (error?.code === "auth/user-not-found") {
        // User doesn't exist → create Firebase user
        await firebaseAuth.createUser({
          uid: firebaseUid,
          email: user.email || undefined,
          displayName: fullName,
        });
      } else {
        throw error;
      }
    }

    // -----------------------------------------
    // 8. Store trusted Firebase claims
    // -----------------------------------------

    await firebaseAuth.setCustomUserClaims(firebaseUid, {
      wordpressUserId: String(user.id),
      firstName,
      lastName,
      fullName,
      role,
    });

    // -----------------------------------------
    // 9. Store user profile in Firestore
    //
    // users/wp_169
    // -----------------------------------------

    const db = getFirestore(firebaseAdmin);

    await db.collection("users").doc(firebaseUid).set(
      {
        wordpressUserId: String(user.id),
        email: user.email || "",
        firstName,
        lastName,
        displayName: fullName,
        role,
        updatedAt: FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    // -----------------------------------------
    // 10. Create Firebase Custom Token
    // -----------------------------------------

    const firebaseToken =
      await firebaseAuth.createCustomToken(firebaseUid);

    console.log(
      "Firebase authentication successful:",
      firebaseUid,
      role
    );

    // -----------------------------------------
    // 11. Send response to Next.js browser
    // -----------------------------------------

    return NextResponse.json(
      {
        success: true,

        user: {
          id: user.id,
          email: user.email,
          firstName,
          lastName,
          name: fullName,
          role,
        },

        firebaseToken,
      },
      {
        status: 200,
        headers: corsHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "WordPress → Firebase authentication error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Authentication service temporarily unavailable.",
      },
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

// -----------------------------------------
// OPTIONS / CORS
// -----------------------------------------

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}