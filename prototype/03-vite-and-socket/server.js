import express from 'express';
import https from 'https';
import fs from 'fs';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

const app = express();

const options = {
    key: fs.readFileSync('localhost.key'),
    cert: fs.readFileSync('localhost.crt')
};

const server = https.createServer(options, app);
const io = new SocketServer(server, {
    cors: {
        origin: "https://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const port = 443;
const clients = {};

// Use CORS middleware
app.use(cors({
    origin: "https://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.static('public'));

server.listen(port, () => {
    console.log(`🙉 app listening on port ${port}`);
});

io.on('connection', (socket) => {
    console.log(`✅ connection ${socket.id}`);

    clients[socket.id] = { id: socket.id };
    console.log(clients);

    socket.emit('clients', clients);

    socket.on('disconnect', () => {
        console.log(`❌ disconnection ${socket.id}`);
        delete clients[socket.id];
        console.log(clients);
    });
});
