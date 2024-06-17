import { defineConfig } from 'vite';
import fs from 'fs';

// https://109.106.244.62:3000
// https://localhost:443

export default defineConfig({
    site: 'https://jitsedekeyser.be',
    base: 'vite-and-socket',
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
