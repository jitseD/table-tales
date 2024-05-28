
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
const danceCodes = {};
const timestampThreshold = 3000;
let swipeEvents = [];

app.use(express.static('public'))
app.use('/node_modules', express.static('node_modules'));
server.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

const generateRandomCode = (codeLength) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < codeLength; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters.charAt(randomIndex);
    }

    return code;
}

const calculateSimultaneousSwipes = (latestSwipeEvent) => {
    swipeEvents = swipeEvents.filter(swipeEvent => {
        const timeDifferenceNow = Math.abs(swipeEvent.timestamp - Date.now());
        return timeDifferenceNow <= timestampThreshold;
    });

    if (swipeEvents.length > 0) {
        for (let i = 0; i < swipeEvents.length - 1; i++) {
            const timeDifference = Math.abs(swipeEvents[i].timestamp - latestSwipeEvent.timestamp);
            if (timeDifference <= timestampThreshold && swipeEvents[i].id !== latestSwipeEvent.id) {
                console.log(`timeDifference: ${timeDifference}`);
            }
        }
    }
};

io.on('connection', socket => {
    console.log(`Connection`);

    socket.on('hostDance', (codeLength) => {
        let code;
        do {
            code = generateRandomCode(codeLength);
        } while (danceCodes[code]);

        danceCodes[code] = [socket.id];
        socket.join(code);
        socket.emit('danceCode', code);
    });

    socket.on('joinDance', code => {
        if (danceCodes[code]) {
            danceCodes[code].push(socket.id);
            socket.join(code);
            socket.emit('joinedDance', code);
            io.to(code).emit('clientList', danceCodes[code]);
        } else {
            socket.emit('invalidCode');
        }
    });

    socket.on('swipe', (code, data, timestamp) => {
        const swipeEvent = { id: socket.id, code, data, timestamp }
        calculateSimultaneousSwipes(swipeEvent);
        swipeEvents.push(swipeEvent);
    });

    socket.on('disconnect', () => {
        for (const code in danceCodes) {
            danceCodes[code] = danceCodes[code].filter(id => id !== socket.id);
            socket.leave(code);
            if (danceCodes[code].length === 0) {
                delete danceCodes[code];
            } else {
                io.to(code).emit('clientList', danceCodes[code]);
            }
        }
    });
});
