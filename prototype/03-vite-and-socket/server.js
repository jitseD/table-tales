import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;
const clients = {};

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

io.on(`connection`, (socket) => {
    console.log(`✅ connection ${socket.id}`);

    clients[socket.id] = {id: socket.id};
    console.log(clients);

    socket.emit(`clients`, clients);

    socket.on(`disconnect`, () => {
        console.log(`❌ disconnection ${socket.id}`);
        delete clients[socket.id];
        console.log(clients);
    });
});