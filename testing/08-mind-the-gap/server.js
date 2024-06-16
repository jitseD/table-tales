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

app.use(express.static(`public`))
server.listen(port, () => {
    console.log(`🙉 app listening on port ${port}`)
})

// ----- calculation functions ----- //
const normalizeAngle = (angle) => ((angle % 360) + 360) % 360;
const getScreenCoord = (i, screen) => {
    switch (i) {
        case 1: return { x: screen.width, y: 0 };                             // Top-right
        case 2: return { x: screen.width, y: screen.height };                 // Bottom-right
        case 3: return { x: 0, y: screen.height };                            // Bottom-left
        default: return { x: 0, y: 0 };                                       // Top-left
    }
}
const getExtremeCoords = (coords) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    coords.forEach(({ x, y }) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    })

    return { minX, minY, maxX, maxY };
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
    updateRoomCanvas(code);

    if (Object.keys(rooms[code].clients).length === 0) return delete rooms[code];
    else if (rooms[code].host === clientId) rooms[code].host = Object.keys(rooms[code].clients)[0];

    io.to(code).emit(`room`, rooms[code]);
}

// ----- swipe connecting ----- //
const calculateSimultaneousSwipes = (code, latestSwipeEvent) => {
    const timesThreshold = 5000;
    swipeEvents = swipeEvents.filter(({ timestamp }) => Math.abs(timestamp - latestSwipeEvent.timestamp) <= timesThreshold);
    const roomSwipeEvents = swipeEvents.filter(swipeEvent => swipeEvent.code === code && swipeEvent.id !== latestSwipeEvent.id);

    if (roomSwipeEvents.length > 0) {
        for (let i = roomSwipeEvents.length - 1; i >= 0; i--) {
            const clientA = rooms[code].clients[swipeEvents[i].id];
            const clientB = rooms[code].clients[latestSwipeEvent.id];

            if (clientA && clientB) {
                if (clientA.connected && clientB.connected) continue;

                let primaryClient = !clientB.connected ? clientA : clientB;
                let secondaryClient = !clientB.connected ? clientB : clientA;
                let swipeA = !clientB.connected ? swipeEvents[i].data : latestSwipeEvent.data;
                let swipeB = !clientB.connected ? latestSwipeEvent.data : swipeEvents[i].data;

                input = { clientA: primaryClient, swipeA, clientB: secondaryClient, swipeB };
                const relPos = calculateRelPos(input);

                secondaryClient.coords = relPos.coords;
                secondaryClient.rotation = (relPos.rotation + clientA.rotation + 180) % 360;

                updateRoomCanvas(code);
                swipeEvents.splice(swipeEvents.indexOf(roomSwipeEvents[i]), 1);

                secondaryClient.connected = primaryClient.connected = true;
                return;
            }
        }
    }

    swipeEvents.push(latestSwipeEvent);
}
const calculateRelPos = ({ clientA, swipeA, clientB, swipeB }) => {
    const angleDiff = normalizeAngle(swipeB.angle - swipeA.angle);                                 // deg
    const coords = Array.from({ length: 10 }, (_, i) => {
        const coord = getScreenCoord(i, clientB);
        return calculateRelCoords(coord, angleDiff, clientA, clientB, swipeA, swipeB)
    })

    return { coords, rotation: angleDiff };
}
const calculateRelCoords = (coord, angleDiff, clientA, clientB, swipeA, swipeB) => {
    const { minX, maxX, minY, maxY } = getExtremeCoords(clientA.coords);
    const centerAX = minX + (maxX - minX) / 2;
    const centerAY = minY + (maxY - minY) / 2;
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

    const allCoords = clients.flatMap(client => client.coords);
    const { minX, minY, maxX, maxY } = getExtremeCoords(allCoords);

    // shift coords so that lowest value is origin
    const shiftX = minX, shiftY = minY;
    clients.forEach(client => client.coords.map(({ x, y }) => ({ x: x - shiftX, y: y - shiftY })));

    rooms[code].canvas = { width: maxX - minX, height: maxY - minY };
    io.to(code).emit(`updateCanvas`, rooms[code]);
}

io.on(`connection`, socket => {
    console.log(`✅ connection`);

    socket.on(`connectToRoom`, (code, data) => {
        socket.join(code);
        data.id = socket.id;
        data.connected = false;
        addClientToRoom(code, data);
        io.to(code).emit(`room`, rooms[code]);
    });

    socket.on(`swipe`, (code, data, timestamp) => {
        calculateSimultaneousSwipes(code, { id: socket.id, code, data, timestamp });
    });

    socket.on(`updateForces`, (code, forces, square) => {
        io.to(code).emit(`updateForces`, forces, square);
    })

    socket.on(`boxOnScreen`, (targetId, square, forces) => {
        io.to(targetId).emit(`boxOnScreen`, square, forces, socket.id);
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
