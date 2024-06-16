import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
    server: {
        https: {
            key: fs.readFileSync('localhost.key'),
            cert: fs.readFileSync('localhost.crt'),
        },
        proxy: {
            '/socket.io': {
                target: 'https://localhost:443',
                ws: true,
                secure: false,
                changeOrigin: true
            },
        },
    },
});
