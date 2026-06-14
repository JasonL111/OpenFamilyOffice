import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  dataDir: process.env.DATA_DIR ?? "./data",
  jwt: {
    secret: required("JWT_SECRET", "dev_only_insecure_secret"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  cookie: {
    name: "fo_session",
    secure: process.env.COOKIE_SECURE === "true",
  },
} as const;
