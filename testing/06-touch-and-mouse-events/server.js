
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
const danceRooms = {};
const timestampThreshold = 3000;
let swipeEvents = [];

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
const generateRandomCode = (codeLength) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < codeLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }

    return code;
}
const addClientToRoom = (code, client) => {
    const coords = [];
    for (let i = 0; i < 4; i++) {
        const coord = getScreenCoord(i, client);
        coords.push(coord);
    }
    client.coords = coords;

    if (!danceRooms[code]) {
        danceRooms[code] = { clients: {}, canvas: { width: client.width, height: client.height }, host: client.id };
    }
    danceRooms[code].clients[client.id] = client;
}
const removeClientFromRoom = (code, clientId) => {
    delete danceRooms[code].clients[clientId];
    if (danceRooms[code].length === 0) {
        delete danceRooms[code];
    } else {
        const roomClients = Object.keys(danceRooms[code].clients);
        if (danceRooms[code].host === clientId) {
            danceRooms[code].host = roomClients[0];
        }
        io.to(code).emit('clientList', roomClients);
    }
};

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
                const clientA = danceRooms[code].clients[swipeEvents[i].id];
                const clientB = danceRooms[code].clients[latestSwipeEvent.id];

                const relPos = calculateRelPos(clientA, clientB, swipeEvents[i].data, latestSwipeEvent.data);
                danceRooms[code].clients[latestSwipeEvent.id].coords = relPos.coords;
                updateRoomCanvas(code);

                swipeEvents.splice(swipeEvents.indexOf(roomSwipeEvents[i]), 1);
                return;
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

// ----- update canvas ------ //
const updateRoomCanvas = (code) => {
    const clients = Object.values(danceRooms[code].clients);
    if (clients.length === 0) return;

    let minX = 0;
    let minY = 0;
    let maxX = danceRooms[code].canvas.width;
    let maxY = danceRooms[code].canvas.height;

    clients.forEach(client => {
        client.coords.forEach(coord => {
            if (coord.x < minX) minX = coord.x;
            if (coord.y < minY) minY = coord.y;
            if (coord.x > maxX) maxX = coord.x;
            if (coord.y > maxY) maxY = coord.y;
        });
    });

    const shiftX = minX;                                                    // shift coords so that lowest value is origin
    const shiftY = minY;

    clients.forEach(client => {
        client.coords = client.coords.map(coord => ({
            x: coord.x - shiftX,
            y: coord.y - shiftY
        }));
    });

    danceRooms[code].canvas = { width: maxX - minX, height: maxY - minY };
    io.to(code).emit(`updateCanvas`, danceRooms[code]);
}

io.on('connection', socket => {
    console.log(`Connection`);

    socket.on('hostDance', (codeLength, data) => {
        let code;
        do {
            code = generateRandomCode(codeLength);
        } while (danceRooms[code]);

        data.id = socket.id;
        addClientToRoom(code, data);
        socket.join(code);
        socket.emit('danceCode', code);
    });

    socket.on('joinDance', (code, data) => {
        if (danceRooms[code]) {
            data.id = socket.id;
            addClientToRoom(code, data);
            socket.join(code);
            socket.emit('joinedDance', code);
            const roomClients = Object.keys(danceRooms[code].clients);
            io.to(code).emit('clientList', roomClients);
        } else {
            socket.emit('invalidCode');
        }
    });

    socket.on('swipe', (code, data, timestamp) => {
        const swipeEvent = { id: socket.id, code, data, timestamp }
        calculateSimultaneousSwipes(code, swipeEvent);
    });

    socket.on(`showSquare`, (code, square) => {
        io.to(code).emit(`showSquare`, square);
    })

    socket.on('disconnect', () => {
        for (const code in danceRooms) {
            socket.leave(code);
            removeClientFromRoom(code, socket.id);
        }
    });
});
