const $myId = document.querySelector(`.my__id`);
const $roomCode = document.querySelector(`.room__code`);
const $isHost = document.querySelector(`.is__host`);
const $swipe = document.querySelector(`.swipe`);
const $otherIds = document.querySelector(`.other__ids`);
const $canvas = document.querySelector(`.canvas`);
const $video = document.querySelector(`.video`);

let socket;
let roomCode, roomHost = false, roomClients = {};
let myCoords, otherCoords, allCoords;
let lastTimeSent = 0;
let animationFrameId;
const tolerance = 50;
let emptyCoords = [], screenCoords = [];
const swipe = { start: { x: null, y: null }, end: { x: null, y: null }, angle: null, isSwiping: false, isMouseDown: false, }
const screenDimensions = { height: innerHeight, width: innerWidth };
const canvas = { ctx: null, height: null, width: null };
let square, attractions = [], repulsions = [];

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
        case 90:
            $canvas.style.left = `${screenDimensions.width + minY}px`;
            $canvas.style.top = `${-minX}px`;
            break;
        case 180:
            $canvas.style.left = `${screenDimensions.width + minX}px`
            $canvas.style.top = `${screenDimensions.height + minY}px`;
            break;
        case 270:
            $canvas.style.top = `${screenDimensions.height + minX}px`;
            $canvas.style.left = `${-minY}px`;
            break;
        default:
            $canvas.style.left = `${-minX}px`;
            $canvas.style.top = `${-minY}px`;
            break;
    }

    showConnectionLines();
}
const clampValue = (value, min, max) => {
    return Math.max(min, Math.min(max, value))
};
const randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// ----- miscellaneous ----- //
const setRoomHost = (hostId) => {
    if (hostId === socket.id) {
        $isHost.textContent = `I am the room host`;
        roomHost = true;
    } else {
        $isHost.textContent = `I am NOT the room host`;
        roomHost = false;
    }
}

// ----- coords ----- //
const updateCoords = (room) => {
    otherCoords = [];
    allCoords = [];

    Object.values(room.clients).map((client) => {
        if (client.id === socket.id) myCoords = client.coords;
        else otherCoords.push(client.coords);
        allCoords.push(client.coords);
        roomClients[client.id] = { coords: client.coords, id: client.id, boxOnScreen: false };
    });
}

// ----- forces ----- //
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        this.x = this.x + vector.x;
        this.y = this.y + vector.y;
    }

    sub(vector) {
        this.x = this.x - vector.x;
        this.y = this.y - vector.y;
    }

    mult(n) {
        this.x = this.x * n;
        this.y = this.y * n;
    }

    div(n) {
        this.x = this.x / n;
        this.y = this.y / n;
    }

    abs() {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    }

    limit(max) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        let m = this.mag();
        if (m > 0) {
            this.div(m);
        }
    }
}
class Mover {
    constructor(pos, vel, acc) {
        this.size = 300;
        this.pos = new Vector(pos?.x || 100, pos?.y || 100);
        this.vel = new Vector(vel?.x || 1, vel?.y || 1);
        this.acc = new Vector(acc?.x || 0, acc?.y || 0);
        this.mass = this.size;
        this.topSpeed = 10;
        this.fill = `black`;
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);

        this.vel.limit(this.topSpeed);
        this.acc.mult(0);
    }

    show() {
        $video.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px)`;
    }

    applyForce(force) {
        let f = new Vector(force.x, force.y);
        f.div(this.mass);
        this.acc.add(f);
    }

    checkBoxOnScreen() {
        Object.values(roomClients).forEach((client) => {
            const { minX, maxX, minY, maxY } = getExtremeCoords(client.coords);
            const isOnScreen = !(this.pos.x + this.size < minX || this.pos.x > maxX
                || this.pos.y + this.size < minY || this.pos.y > maxY);

            if (isOnScreen && client.id !== socket.id && !client.boxOnScreen) {
                const forces = { attractions, repulsions }
                socket.emit(`boxOnScreen`, client.id, square, forces);
            }

            client.boxOnScreen = isOnScreen;
        })
    }
}
class Force {
    constructor(pos, size, fill) {
        this.size = size;
        this.pos = new Vector(pos.x, pos.y);
        this.fill = fill;
    }

    calculateForce(mover) {
        const { dist, diff } = this.calculateDistanceFromBox(mover);
        let forceStrength = this.calculateForceStrength(dist) * this.size;

        diff.normalize();
        diff.mult(forceStrength);
        mover.applyForce(diff);

    }

    calculateDistanceFromBox(mover) {
        const diff = new Vector(this.pos.x, this.pos.y);
        diff.sub(mover.pos);
        const dist = diff.mag();
        return { dist, diff }
    }
}
class Attraction extends Force {
    constructor(pos, size) {
        super(pos, size, `green`);
    }

    calculateForceStrength(dist) {
        return 1000 / dist;
    }
}
class Repulsion extends Force {
    constructor(pos, size) {
        super(pos, size, `red`);
    }

    calculateForceStrength(dist) {
        return -1000 / dist;
    }
}
const createForces = () => {
    attractions = [];
    allCoords.forEach((coords => {
        const { minX, maxX, minY, maxY } = getExtremeCoords(coords);

        for (let i = 0; i < 3; i++) {
            const size = randomNumber(10, 20);
            const pos = { x: randomNumber(minX, maxX - square.size), y: randomNumber(minY, maxY - square.size) };

            const attraction = new Attraction(pos, size);
            attractions.push(attraction);
        }
    }))

    repulsions = emptyCoords.map(coord => new Repulsion(coord, 1));

    const forces = { attractions, repulsions }
    socket.emit(`updateForces`, roomCode, forces, square);
}
const setForces = (forces) => {
    attractions = forces.attractions.map(force => new Attraction(force.pos, force.size));
    repulsions = forces.repulsions.map(force => new Repulsion(force.pos, force.size));
}

// ----- gaps ----- //
const findGaps = () => {
    emptyCoords = [];
    screenCoords = []

    for (let i = 0; i < canvas.width; i += Math.floor(canvas.width / 20)) {
        for (let j = 0; j < canvas.height; j += Math.floor(canvas.height / 20)) {
            const coord = { x: i, y: j }

            if (isCoordInScreen(coord)) screenCoords.push(coord)
            else emptyCoords.push(coord);
        }
    }
}
const isCoordInScreen = (coord) => {
    for (let i = 0; i < allCoords.length; i++) {
        const { minX, maxX, minY, maxY } = getExtremeCoords(allCoords[i]);

        if (minX - tolerance <= coord.x && coord.x <= maxX + tolerance
            && minY - tolerance <= coord.y && coord.y <= maxY + tolerance) {
            return true
        }
    }

    return false;
}

// ----- canvas ----- //
const setCanvas = (size) => {
    canvas.width = size.width;
    canvas.height = size.height;

    $canvas.style.width = `${canvas.width}px`;
    $canvas.style.height = `${canvas.height}px`;
}

// ----- animation ----- //
const handleAnimation = () => {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(animateSquare);
    $video.play();
}
const animateSquare = () => {
    attractions = attractions.map((attraction) => {
        const { dist } = attraction.calculateDistanceFromBox(square);
        if (dist > attraction.size * 2) return attraction
        else {
            const randomScreenIndex = Math.floor(Math.random() * allCoords.length);
            const { minX, maxX, minY, maxY } = getExtremeCoords(allCoords[randomScreenIndex]);

            const size = randomNumber(10, 20);
            const pos = { x: randomNumber(minX, maxX- square.size), y: randomNumber(minY, maxY- square.size) };
            return new Attraction(pos, size);
        }
    })

    const forces = [...attractions, ...repulsions];
    forces.forEach(force => {
        force.calculateForce(square);
    });

    square.checkBoxOnScreen();
    const boxOffAllScreens = Object.values(roomClients).every(client => !client.boxOnScreen);

    if (roomClients[socket.id].boxOnScreen || boxOffAllScreens) {
        square.update();
        square.show();
    }

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
        const lineImg = document.createElement('img');
        lineImg.classList.add('connection__line');
        lineImg.setAttribute('src', './assets/img/line.png');

        lineImg.style.rotate = `${line.rotation}deg`;
        lineImg.style.height = `${line.width !== 0 ? line.width : line.height}px`;
        lineImg.style.top = `${line.y}px`;
        lineImg.style.left = `${line.x}px`;

        $canvas.appendChild(lineImg);
    });
}
const getConnectionLine = (screenA, screenB) => {
    const lineWidth = 6;

    if (Math.abs(screenA.minX - screenB.maxX) <= tolerance) return {            // leftArightB
        x: screenA.minX, y: Math.max(screenA.minY, screenB.minY),
        width: Math.abs(screenA.minX - screenA.minX),
        height: Math.abs(Math.max(screenA.minY, screenB.minY) - Math.min(screenA.maxY, screenB.maxY)),
        rotation: 0,
        type: `left`
    }

    if (Math.abs(screenA.maxX - screenB.minX) <= tolerance) return {            // rightAleftB
        x: screenA.maxX - lineWidth, y: Math.max(screenA.minY, screenB.minY),
        width: Math.abs(screenA.maxX - screenA.maxX),
        height: Math.abs(Math.max(screenA.minY, screenB.minY) - Math.min(screenA.maxY, screenB.maxY)),
        rotation: 0,
        type: `right`
    }

    if (Math.abs(screenA.minY - screenB.maxY) <= tolerance) return {            // topAbottomB
        x: Math.max(screenA.minX, screenB.minX), y: screenA.minY + lineWidth,
        width: Math.abs(Math.max(screenA.minX, screenB.minX) - Math.min(screenA.maxX, screenB.maxX)),
        height: Math.abs(screenA.minY - screenA.minY),
        rotation: -90,
        type: `top`
    }

    if (Math.abs(screenA.maxY - screenB.minY) <= tolerance) return {            // bottomAtopB
        x: Math.max(screenA.minX, screenB.minX), y: screenA.maxY,
        width: Math.abs(Math.max(screenA.minX, screenB.minX) - Math.min(screenA.maxX, screenB.maxX)),
        height: Math.abs(screenA.maxY - screenA.maxY),
        rotation: -90,
        type: `bottom`
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
        x: Math.round(clampValue(e.clientX, 0, screenDimensions.width)),
        y: Math.round(clampValue(e.clientY, 0, screenDimensions.height)),
    }

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
        x: Math.round(clampValue(e.changedTouches[0].clientX, 0, screenDimensions.width)),
        y: Math.round(clampValue(e.changedTouches[0].clientY, 0, screenDimensions.height)),
    }

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
    determineSwipeAngle();
    document.querySelector(`.swipe`).textContent = `x: ${swipe.end.x}, y: ${swipe.end.y}, a: ${swipe.angle}`

    const data = { x: swipe.end.x, y: swipe.end.y, angle: swipe.angle };
    console.log(`Swiped in direction:`, data);

    socket.emit(`swipe`, roomCode, data, Date.now());
}

// ----- video ----- //
const checkVideoSupport = (type, codecs) => {
    return $video.canPlayType(`video/${type}; codecs="${codecs}"`) !== ""
}
const adjustVideoFormat = (format) => {
    $video.src = `./assets/vid/test-${format}`;
}

// ----- wake lock ----- //
const requestWakeLock = async () => {
    if (`wakeLock` in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request(`screen`);
        } catch (err) {
            if (err.name != `NotAllowedError`) console.error(`${err.name}, ${err.message}`);
        }
    }
}

const init = () => {
    setCanvas(screenDimensions)
    square = new Mover();

    roomCode = getUrlParameter(`room`);
    $roomCode.textContent = roomCode;

    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
        socket.emit(`connectToRoom`, roomCode, screenDimensions);
    });

    socket.on(`room`, (room) => {
        setRoomHost(room.host);
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
    $canvas.addEventListener(`mousedown`, handleMouseDown);
    $canvas.addEventListener(`mousemove`, handleMouseMove);
    $canvas.addEventListener(`mouseup`, handleMouseUp);

    // ----- touch events ----- //
    $canvas.addEventListener(`touchstart`, handleTouchStart);
    $canvas.addEventListener(`touchmove`, handleTouchMove);
    $canvas.addEventListener(`touchend`, handleTouchEnd);

    // ----- video ----- //
    if (checkVideoSupport(`mp4`, `hvc1`)) adjustVideoFormat(`hecv.mov`);
    else if (checkVideoSupport(`webm`, `vp9, vorbis`)) adjustVideoFormat(`webm.webm`);
    else console.error(`no browser support`);

    // ----- update canvas ----- //
    socket.on(`updateCanvas`, (room) => {
        updateCoords(room);
        setRoomHost(room.host);
        setCanvas(room.canvas);
        positionCanvas(room.clients[socket.id].rotation, myCoords);

        findGaps();
        if (roomHost) {
            createForces();
            handleAnimation();
        }
    })

    socket.on(`updateForces`, (forces, squareData) => {
        if (!roomHost) {
            setForces(forces)
            square = new Mover(squareData.pos, squareData.vel, squareData.acc)
        }
    })

    socket.on(`boxOnScreen`, (squareData, forcesData, fromId) => {
        setForces(forcesData)
        square = new Mover(squareData.pos, squareData.vel, squareData.acc);

        square.update();
        square.show();

        roomClients[socket.id].boxOnScreen = true;
        roomClients[fromId].boxOnScreen = true;
        handleAnimation();
    })

    requestWakeLock();
};

init();