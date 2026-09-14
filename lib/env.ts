/**
 * Centralized, validated environment access.
 *
 * Reading `process.env.X` directly and scattering fallbacks/hardcoded values
 * across route handlers is how secrets and URLs drift between environments.
 * Everything server-side code needs lives here, and fails loudly at import
 * time (not deep inside a request handler) if something required is missing.
 */

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }

  return value;
}

export const serverEnv = {
  get wordpressUrl() {
    return required("WORDPRESS_URL").replace(/\/+$/, "");
  },

  get allowedEmbedOrigins(): string[] {
    return (process.env.ALLOWED_EMBED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  },

  get chatGroupId() {
    return process.env.NEXT_PUBLIC_CHAT_GROUP_ID || "mainGroup";
  },

  get firebaseAdmin() {
    return {
      projectId: required("FIREBASE_PROJECT_ID"),
      clientEmail: required("FIREBASE_CLIENT_EMAIL"),
      privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    };
  },

  get redis() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return null;
    }

    return { url, token };
  },
};

export const publicEnv = {
  chatGroupId: process.env.NEXT_PUBLIC_CHAT_GROUP_ID || "mainGroup",
};
