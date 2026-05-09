import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_STUDIOOS_API_PROXY_TARGET

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: apiProxyTarget
        ? {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
            '/inventory/': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
            '/marketplace/school/': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
            '/marketplace/listings/': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
