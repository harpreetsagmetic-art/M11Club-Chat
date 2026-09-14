"use client";

import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// These NEXT_PUBLIC_* values identify the Firebase project and are meant to
// ship to the browser — they are not secrets. The real access control is
// enforced server-side by Firestore Security Rules and verified ID tokens.
const existingApps = getApps();
const app: FirebaseApp = existingApps[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Session-only persistence keeps the Firebase refresh token in
 * `sessionStorage`, scoped to this browsing session/tab, instead of the SDK
 * default (`localStorage`, which survives closing the browser entirely).
 * The chat widget re-authenticates with a fresh one-time WordPress code
 * every time it's opened, so there is no need to persist the session longer
 * than that — and not storing long-lived auth material in localStorage
 * reduces what a future XSS bug could steal.
 *
 * setPersistence must resolve before any sign-in call, so callers should
 * await `authReady` first.
 */
export const authReady = setPersistence(auth, browserSessionPersistence).catch(
  (error) => {
    console.error("Failed to set Firebase auth persistence:", error);
  },
);
