import { getExtremeCoords } from './shared/utils.js';

// ----- selectors ---- //
const $canvas = document.querySelector(`.canvas`);
const $video = document.querySelector(`.video`);

// ----- global variables ----- //
let socket, room, canvas;
let animationFrameId;
const tolerance = 50;
let emotion;
const emotionSpeed = { calm: 0.005, excitement: 1000, surprise: 1, anxiety: 100, sadness: 0.01, anger: 500 }
let danceElements = [];
let emptyCoords = [], allCoords = [], roomClients = [];
let video, attractions = [], repulsions = [];

// ----- calculation functions ----- //
const randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

// ----- classes ----- //
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
        this.lastTimestamp = 0;
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
                this.lastTimestamp = $video.currentTime;
                socket.emit(`boxOnScreen`, client.id, video, forces);
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

// ----- forces ----- //
const createForces = () => {
    attractions = [];
    allCoords.forEach((coords => {
        const { minX, maxX, minY, maxY } = getExtremeCoords(coords);

        for (let i = 0; i < 3; i++) {
            const size = randomNumber(10, 20);
            const pos = { x: randomNumber(minX, maxX - video.size), y: randomNumber(minY, maxY - video.size) };

            const attraction = new Attraction(pos, size);
            attractions.push(attraction);
        }
    }))

    repulsions = emptyCoords.map(coord => new Repulsion(coord, 1));

    const forces = { attractions, repulsions }
    socket.emit(`updateForces`, room.code, forces, video);
}
const setForces = (forces) => {
    attractions = forces.attractions.map(force => new Attraction(force.pos, force.size));
    repulsions = forces.repulsions.map(force => new Repulsion(force.pos, force.size));
}

// ----- coords ----- //
const updateCoords = (room) => {
    allCoords = [];

    Object.values(room.clients).map((client) => {
        allCoords.push(client.coords);
        roomClients[client.id] = { coords: client.coords, id: client.id, boxOnScreen: false };
    })
}

// ----- gaps ----- //
const findGaps = () => {
    emptyCoords = [];

    for (let i = 0; i < canvas.width; i += Math.floor(canvas.width / 20)) {
        for (let j = 0; j < canvas.height; j += Math.floor(canvas.height / 20)) {
            const coord = { x: i, y: j }
            if (!isCoordInScreen(coord)) emptyCoords.push(coord)
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

// ----- animation ----- //
const handleAnimation = () => {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(animateVideo);
    $video.play();
}
const animateVideo = () => {
    let attractionsChanged = false;

    attractions = attractions.map((attraction) => {
        const { dist } = attraction.calculateDistanceFromBox(video);
        if (dist > attraction.size * 2) return attraction
        else {
            const randomScreenIndex = Math.floor(Math.random() * allCoords.length);
            const { minX, maxX, minY, maxY } = getExtremeCoords(allCoords[randomScreenIndex]);

            const size = randomNumber(10, 20);
            const pos = { x: randomNumber(minX, maxX - video.size), y: randomNumber(minY, maxY - video.size) };
            attractionsChanged = true;
            return new Attraction(pos, size);
        }
    })

    const forces = [...attractions, ...repulsions];
    forces.forEach(force => {
        force.calculateForce(video);
    });

    video.checkBoxOnScreen();
    const boxOffAllScreens = Object.values(roomClients).every(client => !client.boxOnScreen);

    if (roomClients[socket.id].boxOnScreen || boxOffAllScreens) {
        video.update();
        video.show();
    }

    if (attractionsChanged) socket.emit(`updateForces`, room.code, { attractions, repulsions }, video);
    animationFrameId = requestAnimationFrame(animateVideo);

    updatedanceElements();
}

// ----- elements ----- //
const createDanceElements = (count) => {
    const elements = [];

    for (let i = 0; i < count; i++) {
        const size = randomNumber(100, 200);
        const opacity = 1;
        const opacityDecrease = randomNumber(1, 100) * emotionSpeed[emotion];
        const x = randomNumber(0, canvas.width - size);
        const y = randomNumber(0, canvas.height - size);

        const element = setDanceElements(x, y, size, opacity);

        elements.push({ element, opacity, opacityDecrease });
    }
    return elements;
}
const setDanceElements = (x, y, size, opacity) => {
    const $element = document.createElement(`img`);
    $element.classList.add(`canvas__element`);
    $element.setAttribute(`src`, `../assets/img/dance_${emotion}.svg`)
    $element.style.width = `${size}px`;
    $element.style.left = `${x}px`;
    $element.style.top = `${y}px`;
    $element.style.opacity = opacity;

    $canvas.appendChild($element);
    return $element;
}
const updatedanceElements = () => {
    if (danceElements.length > 0) {
        danceElements = danceElements.map(element => {
            element.opacity = Math.max(0, element.opacity - element.opacityDecrease);
            element.element.style.opacity = element.opacity;
            if (element.opacity === 0) element.element.remove();
            return element;
        }).filter(element => element.opacity > 0);
    }

    while (danceElements.length < 5) {
        const size = randomNumber(100, 200);
        const opacity = 1;
        const opacityDecrease = randomNumber(1, 100) / 1000;
        const x = randomNumber(0, canvas.width - size);
        const y = randomNumber(0, canvas.height - size);

        const element = setDanceElements(x, y, size, opacity);

        danceElements.push({ element, opacity, opacityDecrease });
    }
}

export const danceInit = (socketData, roomData, canvasData, emotionData) => {
    socket = socketData;
    room = roomData;
    canvas = canvasData;
    console.log(canvas);
    emotion = emotionData
    video = new Mover();

    updateCoords(roomData);
    findGaps();

    if (socket.id === room.hostId) {
        if (danceElements.length > 0) {
            danceElements.forEach(element => element.element.remove());
        }
        danceElements = [];
        danceElements = createDanceElements(5);
        socket.emit(`danceElements`, room.code, danceElements);
        createForces();
        handleAnimation();
    }

    socket.on(`updateForces`, (forces, videoData) => {
        if (socket.id !== room.hostId) {
            setForces(forces)
            video = new Mover(videoData.pos, videoData.vel, videoData.acc)
        }
    })

    socket.on(`danceElements`, (elements) => {
        if (socket.id !== room.hostId) {
            if (danceElements.length > 0) {
                danceElements.forEach(element => element.element.remove());
            }
            danceElements = [];
            danceElements = danceElements.map(element => {
                const $elements = setDanceElements(element.x, element.y, element.size, element.time);
                return $elements
            });
        }
    })

    socket.on(`boxOnScreen`, (videoData, forcesData, fromId) => {
        setForces(forcesData);
        video = new Mover(videoData.pos, videoData.vel, videoData.acc);
        const timeDiff = Math.abs($video.currentTime - videoData.lastTimestamp);
        if (timeDiff > 0.5) $video.currentTime = videoData.lastTimestamp;

        video.update();
        video.show();

        roomClients[socket.id].boxOnScreen = true;
        roomClients[fromId].boxOnScreen = true;
        handleAnimation();
    })
}