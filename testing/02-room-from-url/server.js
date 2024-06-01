
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
const clients = {};
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

io.on('connection', socket => {
    console.log(`Connection`);

    clients[socket.id] = { id: socket.id };
    const clientIds = Object.keys(clients);
    io.emit(`clients`, clientIds);

    socket.on(`connectToRoom`, (code) => {
        addClientToRoom(code, socket.id)
    })

    socket.on(`disconnect`, () => {
        io.emit(`client-disconnect`, clients[socket.id]);
        delete clients[socket.id];

        const clientIds = Object.keys(clients);
        io.emit(`clients`, clientIds);
    });
});
