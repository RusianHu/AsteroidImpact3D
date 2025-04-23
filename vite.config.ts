import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'assets': resolve(__dirname, 'assets')
    }
  },
  // 静态资源处理
  assetsInclude: ['**/*.gltf', '**/*.glb', '**/*.jpg', '**/*.png'],
  // 开发服务器配置
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true
  },
  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 分块打包配置
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          cannon: ['cannon-es'],
          vendor: ['vue', 'element-plus']
        }
      }
    }
  }
})
