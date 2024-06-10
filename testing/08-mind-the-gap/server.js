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
let swipeEvents = [];
const timestampThreshold = 5000;

app.use(express.static(`public`))
server.listen(port, () => {
    console.log(`🙉 app listening on port ${port}`)
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
const getExtremeCoords = (coords) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    coords.forEach(coord => {
        if (coord.x < minX) minX = coord.x;
        if (coord.y < minY) minY = coord.y;
        if (coord.x > maxX) maxX = coord.x;
        if (coord.y > maxY) maxY = coord.y;
    });

    return { minX, minY, maxX, maxY };
}

// ----- socket room ----- //
const addClientToRoom = (code, client) => {
    const coords = [];
    for (let i = 0; i < 4; i++) {
        const coord = getScreenCoord(i, client);
        coords.push(coord);
    }
    client.coords = coords;
    client.rotation = 0;

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
        const timeDifferenceNow = Math.abs(swipeEvent.timestamp - latestSwipeEvent.timestamp);
        return timeDifferenceNow <= timestampThreshold;
    });

    const roomSwipeEvents = swipeEvents.filter(swipeEvent => {
        return swipeEvent.code === code && swipeEvent.id !== latestSwipeEvent.id;
    });

    if (roomSwipeEvents.length > 0) {
        for (let i = roomSwipeEvents.length - 1; i >= 0; i--) {
            const timeDifference = Math.abs(roomSwipeEvents[i].timestamp - latestSwipeEvent.timestamp);
            if (timeDifference <= timestampThreshold) {
                const clientA = rooms[code].clients[swipeEvents[i].id];
                const clientB = rooms[code].clients[latestSwipeEvent.id];

                if (clientA && clientB) {
                    const relPos = calculateRelPos(clientA, clientB, swipeEvents[i].data, latestSwipeEvent.data);
                    rooms[code].clients[latestSwipeEvent.id].coords = relPos.coords;
                    rooms[code].clients[latestSwipeEvent.id].rotation = (relPos.rotation + clientA.rotation + 180) % 360;
                    updateRoomCanvas(code);

                    swipeEvents.splice(swipeEvents.indexOf(roomSwipeEvents[i]), 1);
                    return;
                }
            }
        }
    }

    swipeEvents.push(latestSwipeEvent);
};
const calculateRelPos = (clientA, clientB, swipeA, swipeB) => {
    const angleDiff = roundAngle(swipeB.angle) - roundAngle(swipeA.angle);    // deg
    const coords = [];

    for (let i = 0; i < 4; i++) {
        const coord = getScreenCoord(i, clientB);
        const relCoord = calculateRelCoords(coord, angleDiff, clientA, clientB, swipeA, swipeB);
        coords.push(relCoord);
    }

    return { coords, rotation: angleDiff };
}
const calculateRelCoords = (coord, angleDiff, clientA, clientB, swipeA, swipeB) => {
    const { minX, minY } = getExtremeCoords(clientA.coords);
    const centerAX = minX + clientA.width / 2;
    const centerAY = minY + clientA.height / 2;
    const centerBX = clientB.width / 2;
    const centerBY = clientB.height / 2;

    const angleDiffRad = (angleDiff - clientA.rotation) * (Math.PI / 180);                         // rad

    // rotate screen B
    let posX = (coord.x - centerBX) * Math.cos(angleDiffRad) - (coord.y - centerBY) * Math.sin(angleDiffRad) + centerBX;
    let posY = (coord.x - centerBX) * Math.sin(angleDiffRad) + (coord.y - centerBY) * Math.cos(angleDiffRad) + centerBY;

    posX = Math.round(posX);
    posY = Math.round(posY);

    // align to center of screen A
    posX += centerAX - centerBX;
    posY += centerAY - centerBY;

    // move screen B by swipe A
    const deltaAX = swipeA.x - clientA.width / 2;
    const deltaAY = swipeA.y - clientA.height / 2;

    switch (clientA.rotation) {
        case 90: posX += deltaAY; posY -= deltaAX; break;
        case 180: posX -= deltaAX; posY -= deltaAY; break;
        case 270: posX -= deltaAY; posY += deltaAX; break;
        default: posX += deltaAX; posY += deltaAY; break;
    }

    // // move screen B by swipe B
    const deltaBX = swipeB.x - centerBX;
    const deltaBY = swipeB.y - centerBY;

    switch (angleDiff + clientA.rotation) {
        case 90: return { x: posX + deltaBY, y: posY - deltaBX };
        case 180: return { x: posX - deltaBX, y: posY - deltaBY };
        case 270: return { x: posX - deltaBY, y: posY + deltaBX };
        default: return { x: posX + deltaBX, y: posY + deltaBY };
    }
}

// ----- update canvas ------ //
const updateRoomCanvas = (code) => {
    const clients = Object.values(rooms[code].clients);
    if (clients.length === 0) return;

    const allCoords = [];
    clients.forEach(client => {
        allCoords.push(...client.coords);
    });

    const { minX, minY, maxX, maxY } = getExtremeCoords(allCoords);

    const shiftX = minX;                                                      // shift coords so that lowest value is origin
    const shiftY = minY;

    clients.forEach(client => {
        client.coords = client.coords.map(coord => ({
            x: coord.x - shiftX,
            y: coord.y - shiftY
        }));
    });

    rooms[code].canvas = { width: maxX - minX, height: maxY - minY };
    io.to(code).emit(`updateCanvas`, rooms[code]);
}

io.on(`connection`, socket => {
    console.log(`✅ connection`);

    socket.on(`connectToRoom`, (code, data) => {
        socket.join(code);
        data.id = socket.id;
        addClientToRoom(code, data);
        io.to(code).emit(`room`, rooms[code]);
    });

    socket.on(`swipe`, (code, data, timestamp) => {
        const swipeEvent = { id: socket.id, code, data, timestamp };
        calculateSimultaneousSwipes(code, swipeEvent);
    });

    socket.on(`updateForces`, (code, forces, square) => {
        io.to(code).emit(`updateForces`, forces, square);
    })

    socket.on(`disconnect`, () => {
        console.log(`❌ disconnection`);
        for (const code in rooms) {
            socket.leave(code);
            removeClientFromRoom(code, socket.id);
            io.to(code).emit(`room`, rooms[code]);
        }
    });
});
