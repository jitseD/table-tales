const $myId = document.querySelector(`.my__id`);
const $roomCode = document.querySelector(`.room__code`);
const $isHost = document.querySelector(`.is__host`);
const $otherIds = document.querySelector(`.other__ids`);
const $canvas = document.querySelector(`.canvas`);

let socket;
let roomCode;
const screenDimensions = { height: innerHeight, width: innerWidth };
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
let square = { x: 50, y: 50, size: 50, dx: 2, dy: 2, fill: `black` };

const getUrlParameter = (name) => {
    name = name.replace(/[\[]/, `\\[`).replace(/[\]]/, `\\]`);
    const regex = new RegExp(`[\\?&]` + name + `=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? false : decodeURIComponent(results[1].replace(/\+/g, ` `));
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
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.ctx.fillStyle = square.fill;
    canvas.ctx.fillRect(square.x, square.y, square.size, square.size);

    square.x += square.dx;
    square.y += square.dy;

    if (square.x + square.size > canvas.width || square.x < 0) square.dx *= -1;
    if (square.y + square.size > canvas.height || square.y < 0) square.dy *= -1;

    requestAnimationFrame(animateSquare);
}

const handleSwipe = e => {
    const data = {
        angle: e.angle,
        x: e.center.x,
        y: e.center.y,
        velocityX: e.velocityX,
        velocityY: e.velocityY
    }

    console.log(e);

    socket.emit('swipe', roomCode, data, Date.now());
}

const init = () => {
    createCanvas();

    roomCode = getUrlParameter(`room`);
    $roomCode.textContent = roomCode;

    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
        socket.emit(`connectToRoom`, roomCode);
    });

    socket.on(`room`, (room) => {
        if (room.host === socket.id) {
            $isHost.textContent = `I am the room host`;
        } else {
            $isHost.textContent = `I am NOT the room host`;
        }

        console.log(room);
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

    animateSquare();
};

init();