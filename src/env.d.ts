/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_ENABLE_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}