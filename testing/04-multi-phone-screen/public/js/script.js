const $myId = document.querySelector(`.my__id`);
const $roomCode = document.querySelector(`.room__code`);
const $isHost = document.querySelector(`.is__host`);
const $swipe = document.querySelector(`.swipe`);
const $otherIds = document.querySelector(`.other__ids`);
const $canvas = document.querySelector(`.canvas`);

let socket;
let roomCode;
let roomHost = false;
let isAnimating = false;
let myCoords;
let otherCoords;
let animationFrameId;
const screenDimensions = { height: innerHeight, width: innerWidth };
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
let square = { x: 50, y: 50, size: 50, dx: 2, dy: 2, fill: `black` };

// ----- calculation functions ----- //
const getUrlParameter = (name) => {
    name = name.replace(/[\[]/, `\\[`).replace(/[\]]/, `\\]`);
    const regex = new RegExp(`[\\?&]` + name + `=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? false : decodeURIComponent(results[1].replace(/\+/g, ` `));
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
const positionCanvas = (rotation, coords) => {
    const { minX, minY, maxX, maxY } = getExtremeCoords(coords);

    $canvas.style.width = `${canvas.width}px`;
    $canvas.style.height = `${canvas.height}px`;
    $canvas.style.rotate = `${rotation}deg`;
    document.querySelector(`.screenRotation`).textContent = rotation;
    document.querySelector(`.screenPos`).textContent = `minX: ${minX}, minY: ${minY}, maxX: ${maxX}, maxY: ${maxY}`;

    switch (rotation) {
        case 0:
            $canvas.style.left = `${-minX}px`
            $canvas.style.top = `${-minY}px`;
            break;
        case 90:
            $canvas.style.left = `${screenDimensions.width + minY}px`
            $canvas.style.top = `${-minX}px`;
            break;
        case 180:
            $canvas.style.left = `${screenDimensions.width + minX}px`
            $canvas.style.top = `${screenDimensions.height + minY}px`;
            break;
        case 270:
            $canvas.style.top = `${screenDimensions.height + minX}px`
            $canvas.style.left = `${-minY}px`;
            break;
        default:
            $canvas.style.left = `${-minX}px`
            $canvas.style.top = `${-minY}px`;
            break;
    }
}

// ----- canvas ----- //
const createCanvas = () => {
    canvas.ctx = $canvas.getContext(`2d`);
    const scale = window.devicePixelRatio;
    $canvas.width = Math.floor(canvas.width * scale);
    $canvas.height = Math.floor(canvas.height * scale);
    canvas.ctx.scale(scale, scale);
    $canvas.style.width = `${canvas.width}px`;
    $canvas.style.height = `${canvas.height}px`;
}

let lastTimeSent = 0;
const animateSquare = (time) => {
    // if (!roomHost) return;

    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = canvas.ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, `white`);
    gradient.addColorStop(0.25, `red`);
    gradient.addColorStop(0.5, `blue`);
    gradient.addColorStop(0.75, `green`);
    gradient.addColorStop(1, `yellow`);
    canvas.ctx.fillStyle = gradient;
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.ctx.fillStyle = square.fill;
    canvas.ctx.fillRect(square.x, square.y, square.size, square.size);

    square.x += square.dx;
    square.y += square.dy;

    if (square.x + square.size > canvas.width || square.x < 0) square.dx *= -1;
    if (square.y + square.size > canvas.height || square.y < 0) square.dy *= -1;

    const diff = time - lastTimeSent;
    if (diff > 1000) {
        lastTimeSent = time;
        socket.emit(`showSquare`, roomCode, square);
    }

    showConnectionLines();
    animationFrameId = requestAnimationFrame(animateSquare);
}
const showSquare = () => {
    if (roomHost) return
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = canvas.ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, `white`);
    gradient.addColorStop(0.25, `red`);
    gradient.addColorStop(0.5, `blue`);
    gradient.addColorStop(0.75, `green`);
    gradient.addColorStop(1, `yellow`);
    canvas.ctx.fillStyle = gradient;
    canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas.ctx.fillStyle = square.fill;
    canvas.ctx.fillRect(square.x, square.y, square.size, square.size);

    showConnectionLines();
}

// ----- side connections ----- //
const showConnectionLines = () => {
    const connectionLines = [];
    const screenA = getExtremeCoords(myCoords);

    for (let i = 0; i < otherCoords.length; i++) {
        const screenB = getExtremeCoords(otherCoords[i]);

        const line = getConnectionLine(screenA, screenB);
        if (line) connectionLines.push(line);
    }

    connectionLines.forEach(line => {
        canvas.ctx.strokeStyle = `black`;
        canvas.ctx.lineWidth = 20;
        canvas.ctx.beginPath();
        canvas.ctx.moveTo(line.x1, line.y1);
        canvas.ctx.lineTo(line.x2, line.y2);
        canvas.ctx.stroke();
    });
};
const getConnectionLine = (screenA, screenB) => {
    const tolerance = 50;

    if (Math.abs(screenA.minX - screenB.maxX) <= tolerance) return {            // leftArightB
        x1: screenA.minX, y1: Math.max(screenA.minY, screenB.minY),
        x2: screenA.minX, y2: Math.min(screenA.maxY, screenB.maxY)
    }

    if (Math.abs(screenA.maxX - screenB.minX) <= tolerance) return {            // rightAleftB
        x1: screenA.maxX, y1: Math.max(screenA.minY, screenB.minY),
        x2: screenA.maxX, y2: Math.min(screenA.maxY, screenB.maxY)
    }

    if (Math.abs(screenA.minY - screenB.maxY) <= tolerance) return {            // topAbottomB
        x1: Math.max(screenA.minX, screenB.minX), y1: screenA.minY,
        x2: Math.min(screenA.maxX, screenB.maxX), y2: screenA.minY
    }

    if (Math.abs(screenA.maxY - screenB.minY) <= tolerance) return {            //bottomAtopB
        x1: Math.max(screenA.minX, screenB.minX), y1: screenA.maxY,
        x2: Math.min(screenA.maxX, screenB.maxX), y2: screenA.maxY
    }

    return null;
};

const handleSwipe = e => {
    $swipe.textContent = `swiped`;
    const data = { angle: e.angle, x: e.center.x, y: e.center.y }
    socket.emit('swipe', roomCode, data, Date.now());
}

const requestWakeLock = async () => {
    try {
        const wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};

const init = () => {
    createCanvas();

    roomCode = getUrlParameter(`room`);
    $roomCode.textContent = roomCode;

    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
        socket.emit(`connectToRoom`, roomCode, screenDimensions);
    });

    socket.on(`room`, (room) => {
        if (room.host === socket.id) {
            $isHost.textContent = `I am the room host`;
        } else {
            $isHost.textContent = `I am NOT the room host`;
        }

        const clientIds = Object.keys(room.clients);
        $otherIds.innerHTML = ``;
        for (const otherSocetId in clientIds) {
            if (clientIds.hasOwnProperty(otherSocetId)) {
                const clientId = clientIds[otherSocetId]
                if (clientId !== socket.id) {
                    const listItem = document.createElement(`li`);
                    listItem.textContent = clientId;
                    $otherIds.appendChild(listItem);
                }
            }
        }
    })

    // ----- hammer ----- //
    const hammer = new Hammer($canvas);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipe', handleSwipe);

    // ----- update canvas ----- //
    socket.on(`updateCanvas`, (room) => {
        otherCoords = [];
        Object.values(room.clients).map((client) => {
            if (client.id === socket.id) myCoords = client.coords;
            else return otherCoords.push(client.coords);
        });

        canvas.width = room.canvas.width;
        canvas.height = room.canvas.height;
        createCanvas();

        positionCanvas(room.clients[socket.id].rotation, myCoords);

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (room.host === socket.id) {
            roomHost = true;
            animationFrameId = requestAnimationFrame(animateSquare);
            isAnimating = true;
        } else {
            roomHost = false;
        }
    })

    socket.on(`showSquare`, (data) => {
        if (!roomHost) {
            square = data;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(animateSquare);
        }
    })

    requestWakeLock();
};

init();