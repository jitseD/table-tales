const $myId = document.querySelector(`.my__id`);
const $roomCode = document.querySelector(`.room__code`);
const $isHost = document.querySelector(`.is__host`);
const $otherIds = document.querySelector(`.other__ids`);
const $canvas = document.querySelector(`.canvas`);

let socket;
let roomCode;
let roomHost = false;
let isAnimating = false;
let allCoords;
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
const animateSquare = () => {
    if (!roomHost) return;
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
    
    socket.emit(`showSquare`, roomCode, square);
    requestAnimationFrame(animateSquare);
    
    showConnectedSides(allCoords);
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
    
        showConnectedSides(allCoords);
}
const showConnectedSides = (coords) => {
    const padding = 10;
    for (let i = 0; i < coords.length; i++) {
        const { minX, minY, maxX, maxY } = getExtremeCoords(coords[i]);
        console.log(minX, minY, maxX - minX, maxY - minY);

        canvas.ctx.strokeStyle = `red`;
        canvas.ctx.lineWidth = padding;
        canvas.ctx.strokeRect(minX - padding, minY - padding, maxX - minX + padding, maxY - minY + padding);
    }
}

const handleSwipe = e => {
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
        allCoords = Object.values(room.clients).map(client => client.coords);

        canvas.width = room.canvas.width;
        canvas.height = room.canvas.height;
        createCanvas();

        console.log(room.clients[socket.id].coords);
        positionCanvas(room.clients[socket.id].rotation, room.clients[socket.id].coords);

        if (room.host === socket.id) {
            roomHost = true;
            if (!isAnimating) animateSquare();
            isAnimating = true;
        } else {
            roomHost = false;
        }
    })

    socket.on(`showSquare`, (data) => {
        if (!roomHost) {
            square = data;
            showSquare();
        }
    })

    requestWakeLock();
};

init();