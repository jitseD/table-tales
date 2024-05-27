const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = 3000;

const clients = {};

app.use(express.static('public'))
server.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

io.on('connection', socket => {
    console.log(`Connection`);

    clients[socket.id] = socket.id;

    io.emit(`clientList`, Object.entries(clients));
    
    socket.on('disconnect', () => {
        delete clients[socket.id];
        io.emit(`clientList`, Object.entries(clients));
    })
});
