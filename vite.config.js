// vite.config.js
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'
import { defineConfig } from 'vite'

import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export default defineConfig({
    plugins: [vue(), cssInjectedByJsPlugin()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        proxy: {
            // 本地开发环境通过代理实现跨域，生产环境使用 nginx 转发
            // 正则表达式写法
            '^/api': {
                target: 'http://127.0.0.1:6806', // 后端服务实际地址
                changeOrigin: true //开启代理
            }
        }
    },
    build: {
        assetsDir: '',
        outDir: 'notegpt',
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, 'src', "main.ts"),
            formats: ['cjs'],
            fileName: 'main',
        },
        commonjsOptions: {
            defaultIsModuleExports: true,
        },
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src', "main.ts"),
            },
            output: {
                name: 'main',
                format: 'commonjs',
                esModule: 'if-default-prop',
                manualChunks: undefined,
            },
            external: ['siyuan'],
        },
        //构建后是否生成 source map 文件
        sourcemap: false,
    },
})
