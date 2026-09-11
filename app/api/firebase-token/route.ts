import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import firebaseAdmin from "@/lib/firebase-admin";

export async function GET() {
  try {
    const uid = "test_user_123";

    const token = await getAuth(firebaseAdmin).createCustomToken(uid);

    return NextResponse.json({
      success: true,
      token,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Firebase token",
      },
      { status: 500 }
    );
  }
}