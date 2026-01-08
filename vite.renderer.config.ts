import { resolve } from 'node:path';
import { defineConfig, type CSSOptions, type UserConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(async (): Promise<UserConfig> => {
  const vue = (await import('@vitejs/plugin-vue')).default;
  const tailwindcss = (await import('@tailwindcss/vite')).default;
  const autoImport = (await import('unplugin-auto-import/vite')).default;

  return {
    plugins: [
      vue(),
      tailwindcss(),
      autoImport({
        imports: ['vue', 'vue-router', 'pinia', 'vue-i18n', '@vueuse/core'],
        dts: 'renderer/auto-imports.d.ts'
      })
    ],
    publicDir: 'public',
    worker: {
      format: 'es',
    },
    css: {
      transformer: 'lightningcss' as CSSOptions['transformer']
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        input: [
          resolve(__dirname, 'html/index.html'),
          resolve(__dirname, 'html/dialog.html'),
          resolve(__dirname, 'html/setting.html')
        ]
      }
    },
    resolve: {
      alias: {
        '@common': resolve(__dirname, 'common'),
        '@main': resolve(__dirname, 'main'),
        '@renderer': resolve(__dirname, 'renderer'),
        '@locales': resolve(__dirname, 'locales')
      }
    }
  };
});