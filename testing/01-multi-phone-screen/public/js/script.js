const $myId = document.querySelector(`.my__id`);
const $otherIds = document.querySelector(`.other__ids`);
const $initiateDance = document.querySelector(`.initiate__dance`);
const $createDance = document.querySelector(`.create__dance`);
const $joinDance = document.querySelector(`.join__dance`);
const $danceLobby = document.querySelector(`.lobby__dance`);
const $danceCode = document.querySelector(`.dance__code`);
const $formDance = document.querySelector(`.form__dance`);
const $danceForm = document.querySelector(`.dance__form`);
const $danceCodeInput = document.querySelector(`.dance__code--input`);
const $canvas = document.querySelector(`.canvas`);

let socket;
let roomCode;
const screenDimensions = { height: innerHeight, width: innerWidth };
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
const square = { x: 50, y: 50, size: 50, dx: 2, dy: 2, fill: `black` };

// ----- canvas ----- //
const createCanvas = () => {
    canvas.ctx = $canvas.getContext(`2d`);
    const scale = window.devicePixelRatio;
    $canvas.width = Math.floor(canvas.width * scale);
    $canvas.height = Math.floor(canvas.height * scale);
    canvas.ctx.scale(scale, scale);

    // animateSquare();

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

// ----- socket room ----- //
const createDanceHandle = () => {
    socket.emit(`hostDance`, 6, screenDimensions);
    socket.on(`danceCode`, (code) => {
        roomCode = code
        $initiateDance.classList.add(`hide`);
        $danceLobby.classList.remove(`hide`);
        $danceCode.textContent = roomCode;
    })
}
const joinDanceHandle = () => {
    $initiateDance.classList.add(`hide`);
    $formDance.classList.remove(`hide`);
}
const danceFormSubmitHandle = e => {
    e.preventDefault();
    const danceCode = $danceCodeInput.value.trim();
    if (danceCode !== ``) {
        socket.emit(`joinDance`, danceCode, screenDimensions);
    } else {
        console.log($danceCodeInput.value);
        console.log(`please enter a dance code`);
    }

    socket.on(`joinedDance`, (code) => {
        roomCode = code
        $danceForm.classList.add(`hide`);
        $danceLobby.classList.remove(`hide`);
        $danceCode.textContent = roomCode;
    })

    socket.on(`invalidCode`, () => {
        console.log(`code not valid: please enter a valis dance code`);
    })
}

// ----- hammer ----- //
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
    // ----- canvas ----- //
    createCanvas();

    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
    });

    socket.on(`clientList`, (clientIds) => {
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

    socket.on(`relativePosition`, ({ coords, rotation }) => {
        canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

        console.log(coords);
        canvas.ctx.beginPath();
        canvas.ctx.strokeStyle = 'red';
        canvas.ctx.strokeWidth = 5;
        canvas.ctx.moveTo(0 + 150, 0 + 150);
        canvas.ctx.lineTo(screenDimensions.width / 5 + 150, 0 + 150);
        canvas.ctx.lineTo(screenDimensions.width / 5 + 150, screenDimensions.height / 5 + 150);
        canvas.ctx.lineTo(0 + 150, screenDimensions.height / 5 + 150);
        canvas.ctx.closePath();
        canvas.ctx.stroke();

        console.log(coords);
        canvas.ctx.beginPath();
        canvas.ctx.strokeStyle = 'blue';
        canvas.ctx.moveTo(coords[0].x / 5 + 150, coords[0].y / 5 + 150);
        for (let i = 1; i < coords.length; i++) {
            canvas.ctx.lineTo(coords[i].x / 5 + 150, coords[i].y / 5 + 150);
        }
        canvas.ctx.closePath();
        canvas.ctx.stroke();
    })

    // ----- socket room ----- //
    $createDance.addEventListener(`click`, createDanceHandle);
    $joinDance.addEventListener(`click`, joinDanceHandle);
    $danceForm.addEventListener(`submit`, danceFormSubmitHandle);

    // ----- hammer ----- //
    const hammer = new Hammer($canvas);
    hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
    hammer.on('swipe', handleSwipe);
};

init();