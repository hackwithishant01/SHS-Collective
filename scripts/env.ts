import { loadEnvConfig } from "@next/env";

// Loads `.env.local`, `.env.development`, `.env` in the same order as Next.js.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
