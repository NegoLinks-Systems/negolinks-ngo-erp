import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // Console statements are stripped from production builds (NegoLinks coding standard §9)
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Only libraries the first screen genuinely needs are grouped by hand.
        // Charting and the document engines (jspdf, docx, xlsx, qrcode) are
        // deliberately left out: naming a chunk here makes it a static
        // dependency of the entry, so recharts and a ~1.2 MB document engine
        // would download before the visitor has even signed in. Left alone,
        // Rollup splits them along the lazy route and dynamic import
        // boundaries where they are actually used.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js', 'zustand'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    coverage: { provider: 'v8', reporter: ['text', 'html'], thresholds: { lines: 80 } },
    exclude: ['node_modules', 'dist', 'src/e2e/**'],
  },
}))
