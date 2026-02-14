import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    build: {
        chunkSizeWarningLimit: 650,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/vue-echarts')) {
                        return 'charts-vue'
                    }
                    if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
                        return 'charts-core'
                    }
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 3000,
        strictPort: true
    }
})
