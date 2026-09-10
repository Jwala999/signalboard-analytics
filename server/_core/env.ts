import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Forge (storage / maps)
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  // OAuth
  oauthPortalUrl: process.env.VITE_OAUTH_PORTAL_URL ?? "",
  appId: process.env.VITE_APP_ID ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",

  // Owner open-id (auto-admin)
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  // LLM / AI
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
} as const;
