
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
let swipeEvents = [];
const timestampThreshold = 3000;

app.use(express.static('public'))
app.use('/node_modules', express.static('node_modules'));
server.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

// ----- socket room ----- //
const addClientToRoom = (code, clientId) => {
    if (!rooms[code]) {
        rooms[code] = { clients: {}, host: clientId };
    }
    rooms[code].clients[clientId] = clientId;
}
const removeClientFromRoom = (code, clientId) => {
    delete rooms[code].clients[clientId];
    if (Object.keys(rooms[code].clients).length === 0) {
        delete rooms[code];
    } else {
        const roomClients = Object.keys(rooms[code].clients);
        if (rooms[code].host === clientId) {
            rooms[code].host = roomClients[0];
        }
    }
}

// ----- swipe connecting ----- //
const calculateSimultaneousSwipes = (code, latestSwipeEvent) => {
    swipeEvents = swipeEvents.filter(swipeEvent => {
        const timeDifferenceNow = Math.abs(swipeEvent.timestamp - Date.now());
        return timeDifferenceNow <= timestampThreshold;
    });

    const roomSwipeEvents = swipeEvents.filter(swipeEvent => {
        return swipeEvent.code === code && swipeEvent.id !== latestSwipeEvent.id;
    });

    if (roomSwipeEvents.length > 0) {
        for (let i = 0; i < roomSwipeEvents.length; i++) {
            const timeDifference = Math.abs(roomSwipeEvents[i].timestamp - latestSwipeEvent.timestamp);
            if (timeDifference <= timestampThreshold) {
                console.log(`simultaneous swipes`);
            }
        }
    }

    swipeEvents.push(latestSwipeEvent)
};

io.on('connection', socket => {
    console.log(`Connection`);

    socket.on(`connectToRoom`, (code) => {
        socket.join(code);
        addClientToRoom(code, socket.id);
        io.to(code).emit('room', rooms[code]);
    });

    socket.on('swipe', (code, data, timestamp) => {
        const swipeEvent = { id: socket.id, code, data, timestamp };
        calculateSimultaneousSwipes(code, swipeEvent);
    });

    socket.on(`disconnect`, () => {
        for (const code in rooms) {
            socket.leave(code);
            removeClientFromRoom(code, socket.id);
            io.to(code).emit('room', rooms[code]);
        }
    });
});
