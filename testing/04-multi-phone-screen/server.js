
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

// ----- calculation functions ----- //
const roundAngle = (angle) => {
    const angleNormalized = ((angle % 360) + 360) % 360;

    if (angleNormalized >= 0 && angleNormalized < 45) return 0;
    if (angleNormalized >= 45 && angleNormalized < 135) return 90;
    if (angleNormalized >= 135 && angleNormalized < 225) return 180;
    if (angleNormalized >= 225 && angleNormalized < 315) return 270;

    return 0;
};
const getScreenCoord = (i, screen) => {
    switch (i) {
        case 0: return { x: 0, y: 0 };                                        // Top-left
        case 1: return { x: screen.width, y: 0 };                             // Top-right
        case 2: return { x: screen.width, y: screen.height };                 // Bottom-right
        case 3: return { x: 0, y: screen.height };                            // Bottom-left
        default: return { x: 0, y: 0 };
    }
}

// ----- socket room ----- //
const addClientToRoom = (code, client) => {
    const coords = [];
    for (let i = 0; i < 4; i++) {
        const coord = getScreenCoord(i, client);
        coords.push(coord);
    }
    client.coords = coords;

    if (!rooms[code]) {
        rooms[code] = { clients: {}, canvas: { width: client.width, height: client.height }, host: client.id };
    }
    rooms[code].clients[client.id] = client;
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
                const clientA = rooms[code].clients[swipeEvents[i].id];
                const clientB = rooms[code].clients[latestSwipeEvent.id];

                const relPos = calculateRelPos(clientA, clientB, swipeEvents[i].data, latestSwipeEvent.data);
                console.log(relPos);
            }
        }
    }

    swipeEvents.push(latestSwipeEvent)
};
const calculateRelPos = (clientA, clientB, swipeA, swipeB) => {
    const angleDiff = roundAngle(swipeB.angle) - roundAngle(swipeA.angle);    // deg
    const coords = [];

    for (let i = 0; i < 4; i++) {
        const coord = getScreenCoord(i, clientB);
        const relCoordinate = calculateRelCoords(coord, angleDiff, clientA, clientB, swipeA, swipeB);
        coords.push(relCoordinate);
    }

    return { coords, rotation: angleDiff };
}
const calculateRelCoords = (coord, angleDiff, clientA, clientB, swipeA, swipeB) => {
    const centerX = clientB.width / 2;
    const centerY = clientB.height / 2;
    const angleDiffRad = angleDiff * (Math.PI / 180);                         // rad

    // rotate screen B
    let posX = (coord.x - centerX) * Math.cos(angleDiffRad) - (coord.y - centerY) * Math.sin(angleDiffRad) + centerX;
    let posY = (coord.x - centerX) * Math.sin(angleDiffRad) + (coord.y - centerY) * Math.cos(angleDiffRad) + centerY;

    // move screen B by swipe A
    posX = posX + swipeA.x - clientA.width / 2;
    posY = posY + swipeA.y - clientA.height / 2;

    // // move screen B by swipe B
    const deltaX = swipeB.x - centerX;
    const deltaY = swipeB.y - centerY;

    switch (angleDiff) {
        case 90: return { x: posX + deltaY, y: posY - deltaX };
        case 180: return { x: posX - deltaX, y: posY - deltaY };
        case 270: return { x: posX - deltaY, y: posY + deltaX };
        default: return { x: posX + deltaX, y: posY + deltaY };
    }
}

io.on('connection', socket => {
    console.log(`Connection`);

    socket.on(`connectToRoom`, (code, data) => {
        socket.join(code);
        data.id = socket.id;
        addClientToRoom(code, data);
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
