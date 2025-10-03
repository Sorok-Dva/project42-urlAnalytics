/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_PUBLIC_BASE_URL: string
  readonly VITE_DISABLE_SIGNUP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
