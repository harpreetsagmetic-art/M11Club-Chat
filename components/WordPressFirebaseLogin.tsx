"use client";

import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase-client";

type Props = {
  firebaseToken: string;
};

export default function WordPressFirebaseLogin({
  firebaseToken,
}: Props) {
  const loginToFirebase = async () => {
    try {
      const result = await signInWithCustomToken(
        auth,
        firebaseToken
      );

      console.log("Firebase login successful!");
      console.log("Firebase UID:", result.user.uid);
      console.log("Firebase email:", result.user.email);

    } catch (error) {
      console.error("Firebase login failed:", error);
    }
  };

  return (
    <button onClick={loginToFirebase}>
      Login to Firebase
    </button>
  );
}