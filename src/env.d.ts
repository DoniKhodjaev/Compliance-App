/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL2: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 