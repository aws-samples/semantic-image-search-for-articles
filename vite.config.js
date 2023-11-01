import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
            global: "globalThis", //<-- AWS SDK
        },
    },
  },
  plugins: [react()],
  resolve: {
    // this is required for Amplify
    alias: {
        './runtimeConfig': './runtimeConfig.browser',
    },
  },
})