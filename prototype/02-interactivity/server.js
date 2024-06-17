const express = require(`express`);
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
server.listen(port, () => {
    console.log(`🙉 app listening on port ${port}`)
})

// ----- calculation functions ----- //
const getScreenCoord = (i, screen) => {
    switch (i) {
        case 1: return { x: screen.width, y: 0 };                             // Top-right
        case 2: return { x: screen.width, y: screen.height };                 // Bottom-right
        case 3: return { x: 0, y: screen.height };                            // Bottom-left
        default: return { x: 0, y: 0 };                                       // Top-left
    }
}

// ----- socket room ----- //
const addClientToRoom = (code, client) => {
    const coords = Array.from({ length: 10 }, (_, i) => getScreenCoord(i, client));
    client.coords = coords;
    client.rotation = 0;

    if (!rooms[code]) {
        rooms[code] = { clients: {}, canvas: { width: client.width, height: client.height }, host: client.id };
    }
    rooms[code].clients[client.id] = client;
}
const removeClientFromRoom = (code, clientId) => {
    delete rooms[code].clients[clientId];
    // updateRoomCanvas(code);

    if (Object.keys(rooms[code].clients).length === 0) return delete rooms[code];
    else if (rooms[code].host === clientId) rooms[code].host = Object.keys(rooms[code].clients)[0];

    io.to(code).emit(`room`, rooms[code]);
}

io.on(`connection`, socket => {
    console.log(`✅ connection `, socket.id);

    socket.on(`connectToRoom`, (code, data) => {
        socket.join(code);
        data.id = socket.id;
        data.connected = false;
        addClientToRoom(code, data);
        io.to(code).emit(`room`, rooms[code]);
    });

    socket.on(`disconnect`, () => {
        console.log(`❌ disconnection `, socket.id);
        for (const code in rooms) {
            socket.leave(code);
            removeClientFromRoom(code, socket.id);
            io.to(code).emit(`room`, rooms[code]);
        }
    })
});
