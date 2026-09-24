import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

const elementPlusResolver = ElementPlusResolver({ importStyle: 'css' })

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [elementPlusResolver],
    }),
    Components({
      resolvers: [elementPlusResolver],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      buffer: fileURLToPath(new URL('./node_modules/buffer/index.js', import.meta.url)),
    },
  },
  define: {
    'process.env': {},
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  build: {
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
      pure: process.env.NODE_ENV === 'production'
        ? ['console.log', 'console.debug', 'console.info']
        : [],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('element-plus')) return 'element-plus'
          if (id.includes('exceljs')) return 'exceljs'
          if (id.includes('@vue-office')) return 'vue-office'
          if (id.includes('marked') || id.includes('dompurify')) return 'markdown'
          return undefined
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // 本地开发可通过 .env.local 设置 VITE_API_PROXY_TARGET，避免将内网地址写入仓库
        // target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8082',
        target: 'http://10.123.69.140:8082',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
