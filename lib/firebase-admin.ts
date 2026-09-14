import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { serverEnv } from "@/lib/env";

/**
 * `server-only` makes it a build-time error to import this module from any
 * client component, which is the main guardrail against accidentally
 * bundling the service account credentials into client JavaScript.
 */
const existingApps = getApps();

const firebaseAdmin: App =
  existingApps[0] ?? initializeApp({ credential: cert(serverEnv.firebaseAdmin) });

export default firebaseAdmin;
