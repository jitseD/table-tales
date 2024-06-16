import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/socket.io': {
                target: 'http://localhost:3000', // Your Node.js server URL
                ws: true,
            },
        },
    },
});
