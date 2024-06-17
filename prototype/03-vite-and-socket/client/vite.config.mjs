import { defineConfig } from 'vite';
import fs from 'fs';
import { resolve } from 'path';

// https://109.106.244.62:3000
// https://localhost:443

export default defineConfig({
    site: 'https://jitsedekeyser.be',
    base: '/vite-and-socket/',
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                connect: resolve(__dirname, 'connect.html'),
                dance: resolve(__dirname, 'dance.html'),
                dancers: resolve(__dirname, 'dancers.html'),
                emotions: resolve(__dirname, 'emotions.html'),
                ending: resolve(__dirname, 'ending.html'),
                steps: resolve(__dirname, 'steps.html'),
            },
        },
    },
    server: {
        https: {
            key: fs.readFileSync('localhost.key'),
            cert: fs.readFileSync('localhost.crt'),
        },
        proxy: {
            '/socket.io': {
                target: 'https://109.106.244.62:3000',
                ws: true,
                secure: false,
                changeOrigin: true
            },
        },
    },
});
