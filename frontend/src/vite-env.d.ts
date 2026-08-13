/// <reference types="vite/client" />

// This triple-slash directive pulls in Vite's client type definitions.
// It teaches TypeScript about Vite-specific features such as import.meta.env
// (how we'll read VITE_-prefixed environment variables) and asset imports.

// Type our own VITE_ env vars so import.meta.env.X is checked, not `any`.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
