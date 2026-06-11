import { defineConfig } from '@playwright/test'

// Prérequis : stack lancée (docker compose up -d) sur http://localhost:3000
// + un compte admin bootstrappé (ADMIN_PSEUDO / ADMIN_PASSWORD dans .env).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  },
})
