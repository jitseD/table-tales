const $myId = document.querySelector(`.my__id`);
const $roomCode = document.querySelector(`.room__code`);
const $isHost = document.querySelector(`.is__host`);
const $swipe = document.querySelector(`.swipe`);
const $otherIds = document.querySelector(`.other__ids`);
const $canvas = document.querySelector(`.canvas`);

let socket;
let roomCode, roomHost = false;
let myCoords, otherCoords, allCoords;
let lastTimeSent = 0;
let animationFrameId;
let emptyCoords = [];
const swipe = { start: { x: null, y: null }, end: { x: null, y: null }, angle: null, isSwiping: false, isMouseDown: false, }
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
const clampValue = (value, min, max) => {
    return Math.max(min, Math.min(max, value))
};


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
const animateSquare = (time) => {
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

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
}
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
}

// ----- mouse events ----- //
const handleMouseDown = e => {
    swipe.start = { x: e.clientX, y: e.clientY }
    swipe.isMouseDown = true;
}
const handleMouseMove = e => {
    if (!swipe.isMouseDown) return;
    swipe.isSwiping = true;
}
const handleMouseUp = e => {
    swipe.isMouseDown = false;
    if (!swipe.isSwiping) return;

    swipe.end = {
        x: clampValue(e.clientX, 0, screenDimensions.width),
        y: clampValue(e.clientY, 0, screenDimensions.height),
    }

    determineSwipeAngle();
    handleSwipe();

    swipe.isSwiping = false;
}

// ----- touch events ----- //
const handleTouchStart = e => {
    e.preventDefault();
    swipe.start = { x: e.touches[0].clientX, y: e.touches[0].clientY }
}
const handleTouchMove = e => {
    e.preventDefault();
    swipe.isSwiping = true;
}
const handleTouchEnd = e => {
    e.preventDefault();
    if (!swipe.isSwiping) return;

    swipe.end = {
        x: clampValue(e.changedTouches[0].clientX, 0, screenDimensions.width),
        y: clampValue(e.changedTouches[0].clientY, 0, screenDimensions.height),
    }

    determineSwipeAngle();
    handleSwipe();

    swipe.isSwiping = false;
}

// ----- swipe ----- //
const determineSwipeAngle = () => {
    const deltaX = swipe.end.x - swipe.start.x;
    const deltaY = swipe.end.y - swipe.start.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) swipe.angle = deltaX > 0 ? 0 : 180;            // horizontal
    else swipe.angle = deltaY > 0 ? 90 : 270;                                               // vertical

}
const handleSwipe = () => {
    document.querySelector(`.swipe`).textContent = `x: ${swipe.end.x}, y: ${swipe.end.y}, a: ${swipe.angle}`

    const data = { x: swipe.end.x, y: swipe.end.y, angle: swipe.angle };
    console.log('Swiped in direction:', data);

    socket.emit('swipe', roomCode, data, Date.now());
}

const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            if (err.name != 'NotAllowedError') console.error(`${err.name}, ${err.message}`);
        }
    }
}

// ----- gaps ----- //
const findGaps = () => {
    emptyCoords = [];

    for (let i = 0; i < canvas.width; i += Math.floor(canvas.width / 20)) {
        for (let j = 0; j < canvas.height; j += Math.floor(canvas.height / 20)) {
            const coord = { x: i, y: j }
            
            if (!isCoordInScreen(coord)) {
                emptyCoords.push(coord)
            }
        }
    }
};

const isCoordInScreen = (coord) => {
    for (let i = 0; i < allCoords.length; i++) {
        const { minX, maxX, minY, maxY } = getExtremeCoords(allCoords[i]);

        if (minX <= coord.x && coord.x <= maxX && minY <= coord.y && coord.y <= maxY) {
            return true;
        }
    }

    return false;
}

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
            roomHost = true;
        } else {
            $isHost.textContent = `I am NOT the room host`;
            roomHost = false;
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

    // ----- mouse events ----- //
    $canvas.addEventListener('mousedown', handleMouseDown);
    $canvas.addEventListener('mousemove', handleMouseMove);
    $canvas.addEventListener('mouseup', handleMouseUp);

    // ----- touch events ----- //
    $canvas.addEventListener('touchstart', handleTouchStart);
    $canvas.addEventListener('touchmove', handleTouchMove);
    $canvas.addEventListener('touchend', handleTouchEnd);

    // ----- update canvas ----- //
    socket.on(`updateCanvas`, (room) => {
        otherCoords = [];
        allCoords = [];
        Object.values(room.clients).map((client) => {
            if (client.id === socket.id) myCoords = client.coords;
            else otherCoords.push(client.coords);
            allCoords.push(client.coords)
        });

        findGaps();

        canvas.width = room.canvas.width;
        canvas.height = room.canvas.height;
        createCanvas();

        positionCanvas(room.clients[socket.id].rotation, myCoords);

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (room.host === socket.id) {
            roomHost = true;
            animationFrameId = requestAnimationFrame(animateSquare);
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