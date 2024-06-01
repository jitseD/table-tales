
const express = require('express');
const app = express();
const https = require(`https`);
const fs = require(`fs`);

const options = {
    key: fs.readFileSync(`localhost.key`),
    cert: fs.readFileSync(`localhost.crt`)
}

const server = https.createServer(options, app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = 443;
const rooms = {};

app.use(express.static(`public`))
app.use(`/node_modules`, express.static(`node_modules`));
server.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

const addClientToRoom = (code, clientId) => {
    if (!rooms[code]) {
        rooms[code] = { clients: {} };
    }
    rooms[code].clients[clientId] = clientId;
    console.log(rooms);
}

const removeClientFromRoom = (code, clientId) => {
    delete rooms[code].clients[clientId];
    if (rooms[code].length === 0) {
        delete rooms[code];
    } else {
        const roomClients = Object.keys(rooms[code].clients);
        io.to(code).emit('clients', roomClients);
    }
}

io.on('connection', socket => {
    console.log(`Connection`);

    
    socket.on(`connectToRoom`, (code) => {
        socket.join(code);
        addClientToRoom(code, socket.id);

        const roomClients = Object.keys(rooms[code].clients);
        io.to(code).emit('clients', roomClients);
    })

    socket.on(`disconnect`, () => {
        for (const code in rooms) {
            socket.leave(code);
            removeClientFromRoom(code, socket.id);
        }

        const roomClients = Object.keys(rooms[code].clients);
        io.to(code).emit('clients', roomClients);
    });
});
