import { getRoomCode, getExtremeCoords } from './shared/utils.js';
import { danceInit } from './dance.js';

// ----- selectors ----- //
const $pages = document.querySelectorAll(`.page`);
const $steps = document.querySelectorAll(`.section--step`);
const $appNav = document.querySelector(`.app__back`);
const $canvas = document.querySelector(`.canvas`);
const $connectedNumber = document.querySelector(`.connect__number`);
const $connectBtn = document.querySelector(`.connect__btn`);
const $instruction = document.querySelector(`.section--instruction`);
const $dancers = document.querySelectorAll(`.section--dancer`);
const $pickedDancer = document.querySelector(`.instruction__picked`);
const $instructionBtn = document.querySelector(`.instruction__btn`);
const $video = document.querySelector(`.video`);
const $bodyEmotions = document.querySelector(`.body--emotions`);
const $emotionDividers = document.querySelectorAll(`.emotion__divider`);
const $explanation = document.querySelector(`.section--explanation`);
const $emotionEvent = document.querySelector(`.explanation__event`);
const $emotions = document.querySelectorAll(`.section--emotion`);

// ----- global variables ----- //
let socket;
const room = { code: null, hostId: null, clients: {} };
let currentStepIndex = 0, currentPageName = `steps`, currentDancerIndex = 0, currentEmotionIndex = 0;
let isPhoneDown = false;
let myCoords, otherCoords;
const dance = { totalDances: 3, currentDanceIndex: 0 };
const tolerance = 50;
const canvas = { ctx: null, height: null, width: null };
const screenDimensions = { height: innerHeight, width: innerWidth };
const swipe = { start: { x: null, y: null }, end: { x: null, y: null }, angle: null, isSwiping: false, isMouseDown: false, };
const emotinoEvents = [`moving in with their partner for the first time!`, `first month's bill is way higher then expected!`];

// ----- miscellaneous ----- //
const requestWakeLock = async () => {
    if (`wakeLock` in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request(`screen`);
        } catch (err) {
            if (err.name != `NotAllowedError`) console.error(`${err.name}, ${err.message}`);
        }
    }
}

// ----- calculation functions ----- //
const clampValue = (value, min, max) => {
    return Math.max(min, Math.min(max, value))
}

// ----- update visibility ----- //
const updateSteps = () => {
    $steps.forEach(step => step.classList.remove(`visible`));
    $steps[currentStepIndex].classList.add(`visible`);

    if (currentStepIndex === 0) $appNav.textContent = `go back`;
    else $appNav.textContent = `step 0${currentStepIndex}`;

    if (currentStepIndex === 0) {
        $canvas.removeEventListener(`mousedown`, handleMouseDown);
        $canvas.removeEventListener(`mousemove`, handleMouseMove);
        $canvas.removeEventListener(`mouseup`, handleMouseUp);

        $canvas.removeEventListener(`touchstart`, handleTouchStart);
        $canvas.removeEventListener(`touchmove`, handleTouchMove);
        $canvas.removeEventListener(`touchend`, handleTouchEnd);
    } else {
        $canvas.addEventListener(`mousedown`, handleMouseDown);
        $canvas.addEventListener(`mousemove`, handleMouseMove);
        $canvas.addEventListener(`mouseup`, handleMouseUp);

        $canvas.addEventListener(`touchstart`, handleTouchStart);
        $canvas.addEventListener(`touchmove`, handleTouchMove);
        $canvas.addEventListener(`touchend`, handleTouchEnd);
    }
}
const updateDancers = () => {
    const $sections = [$instruction, ...$dancers];
    $sections.forEach(section => section.classList.add(`hide`));
    $sections[currentDancerIndex].classList.remove(`hide`);
}
const updateEmotions = () => {
    const $sections = [$explanation, ...$emotions];
    $sections.forEach(section => section.classList.add(`hide`));
    if (Array.isArray(currentEmotionIndex)) {
        currentEmotionIndex.forEach((index) => {
            $sections[index].classList.remove(`hide`);
        })
        $bodyEmotions.style.gridTemplateRows = `repeat(${currentEmotionIndex.length}, 1fr)`;
        for (let i = 0; i < currentEmotionIndex.length - 1; i++) {
            $emotionDividers[currentEmotionIndex[i] - 1].classList.remove(`hide`);
            console.log($emotionDividers[currentEmotionIndex[i] - 1]);
        }
        if (currentEmotionIndex.length >= 3) $bodyEmotions.classList.add(`small`);
    } else {
        $sections[currentEmotionIndex].classList.remove(`hide`);
        for (let i = 0; i < $emotionDividers.length; i++) {
            $emotionDividers[i].classList.add(`hide`);
        }
    }
}
const updatePages = () => {
    $pages.forEach(page => page.classList.remove(`visible`));
    resetFunctionality();
    let danceTimeout;

    if (currentPageName === `dance`) {
        $canvas.classList.add(`dance`);
        $video.currentTime = 0;
        danceInit(socket, room, canvas);
        clearInterval(danceTimeout);
        danceTimeout = setTimeout(() => socket.emit(`danceEnded`, room.code), 13000)
    } else {
        clearInterval(danceTimeout);
        document.querySelector(`.body--${currentPageName}`).classList.add(`visible`)
        $canvas.classList.remove(`dance`);
        applyFunctionality();
    }
}
const resetFunctionality = () => {

    $connectBtn.classList.add(`hide`);
    $connectBtn.removeEventListener(`click`, handleConnectBtnClick);

    $dancers.forEach(dancer => dancer.removeEventListener(`click`, handleDancerClick));
    $pickedDancer.classList.remove(`visible`);
    $emotions.forEach(emotion => emotion.removeEventListener(`click`, handleEmotionClick));
}
const applyFunctionality = () => {
    switch (currentPageName) {
        case `steps`:
            if (currentStepIndex === 0) $appNav.textContent = `go back`;
            else $appNav.textContent = `step 0${currentStepIndex}`;
            break;
        case `connect`:
            $appNav.textContent = `instructions`;

            if (socket.id === room.hostId) {
                $connectBtn.classList.remove(`hide`);
                $connectBtn.addEventListener(`click`, handleConnectBtnClick);
            }
            break;
        case `dancers`:
            $dancers.forEach(dancer => dancer.addEventListener(`click`, handleDancerClick));
            $instructionBtn.addEventListener(`click`, handleInstructionBtnClick);
            showDancers();
            break;

        case `emotions`:
            $emotionEvent.textContent = emotinoEvents[dance.currentDanceIndex - 1];
            $emotions.forEach(emotion => emotion.addEventListener(`click`, handleEmotionClick));
            showEmotions();
            break;
        default:
            break;
    }
}

// ----- steps ----- //
const handleOrientationEvent = e => {
    const threshold = 5;
    let pageTimeout;

    if (Math.abs(e.beta) < threshold) {
        if (!isPhoneDown) {
            isPhoneDown = true;
            clearTimeout(pageTimeout);
            pageTimeout = setTimeout(() => {
                currentStepIndex = 1;
                updateSteps();
            }, 500);
        }
    } else {
        if (isPhoneDown) {
            isPhoneDown = false;
            clearTimeout(pageTimeout);
            pageTimeout = setTimeout(() => {
                currentStepIndex = 0;
                updateSteps();
            }, 500);
        }
    }
}
const getDeviceOrientation = async () => {
    if (typeof DeviceOrientationEvent != 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState) window.addEventListener('deviceorientation', handleOrientationEvent);
            else console.error(); (`permission not granted`);
        } catch (error) {
            console.error(error);
        }
    } else if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientationEvent);
    } else console.error('not suppoerted');
}
const handleAppNavClick = () => {
    if (currentPageName === `steps`) {
        if (currentStepIndex === 0) {
            window.location.href = 'index.html';
        } else {
            currentStepIndex--;
            updateSteps();
        }
    } else {
        currentStepIndex = 0;
        updatePages();
        if (currentPageName === `connect`) currentPageName = `steps`;
        else if (currentPageName === `dancers`) currentPageName = `connect`;
    }
}

// ----- dancers ----- //
const handleConnectBtnClick = e => socket.emit(`showDancers`, room.code);
const showDancers = () => {
    const clientIds = Object.values(room.clients).map(client => client.id);

    for (let i = 0; i < clientIds.length; i++) {
        if (socket.id === clientIds[i]) currentDancerIndex = i;
    }

    updateDancers();
}
const handleDancerClick = e => {
    const $dancer = $dancers[currentDancerIndex - 1];
    const dancer = {
        title: $dancer.querySelector(`.dancer__title`).textContent,
        name: $dancer.querySelector(`.dancer__author`).textContent
    }
    socket.emit(`dancerPicked`, dancer, room.hostId);
}
const showPickedDancer = (dancer) => {
    $pickedDancer.classList.add(`visible`);
    $pickedDancer.querySelector(`.picked__title`).textContent = dancer.title;
    $pickedDancer.querySelector(`.picked__dancer`).textContent = dancer.name;

    const dancerName = dancer.name.split(' ')[0].toLowerCase();
    $pickedDancer.querySelector(`.picked__img`).setAttribute(`src`, `./assets/img/dancer_${dancerName}_small.png`)
    $pickedDancer.querySelector(`.picked__img`).setAttribute(`atr`, dancer.name)
}

// ----- dance ----- //
const handleInstructionBtnClick = e => socket.emit(`showDance`, room.code);

// ----- emotions ----- //
const showEmotions = () => {
    const clientIds = Object.values(room.clients).map(client => client.id);

    if (clientIds[0] === socket.id) currentEmotionIndex = 0;
    else {
        const emotionClients = clientIds.splice(1);
        const emotionsPerClient = Math.ceil($emotions.length / emotionClients.length);

        const clientEmotions = {};
        emotionClients.forEach((clientId, index) => {
            clientEmotions[clientId] = [];
            for (let i = 0; i < emotionsPerClient; i++) {
                const emotionIndex = (index * emotionsPerClient + i) % $emotions.length + 1;
                clientEmotions[clientId].push(emotionIndex);
            }
        });

        currentEmotionIndex = clientEmotions[socket.id];
    }

    updateEmotions();
}
const handleEmotionClick = () => {
    if (dance.currentDanceIndex < dance.totalDances) socket.emit(`showDance`, room.code);
    else window.location.href = 'ending.html';
}


// ----- coords ----- //
const updateCoords = (socketRoom) => {
    otherCoords = [];
    room.clients = {};

    Object.values(socketRoom.clients).map((client) => {
        if (client.id === socket.id) myCoords = client.coords;
        else otherCoords.push(client.coords);
        room.clients[client.id] = { coords: client.coords, id: client.id, boxOnScreen: false };
    });
}

// ----- canvas ----- //
const setCanvas = (size) => {
    canvas.width = size.width;
    canvas.height = size.height;

    $canvas.style.width = `${canvas.width}px`;
    $canvas.style.height = `${canvas.height}px`;
}
const positionCanvas = (rotation, coords) => {
    const { minX, minY } = getExtremeCoords(coords);

    $canvas.style.width = `${canvas.width}px`;
    $canvas.style.height = `${canvas.height}px`;
    $canvas.style.rotate = `${rotation}deg`;

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
}
const showConnectionLines = () => {
    const $connectionLines = document.querySelectorAll(`.connection__line`);
    $connectionLines.forEach(line => line.remove());
    const connectionLines = [];

    const screenA = getExtremeCoords(myCoords);

    for (let i = 0; i < otherCoords.length; i++) {
        const screenB = getExtremeCoords(otherCoords[i]);

        const line = getConnectionLine(screenA, screenB);
        if (line) connectionLines.push(line);
    }

    connectionLines.forEach(line => {
        const lineImg = document.createElement(`img`);
        lineImg.classList.add(`connection__line`);
        lineImg.setAttribute(`src`, `./assets/img/line_connection.png`);

        lineImg.style.rotate = `${line.rotation}deg`;
        lineImg.style.height = `${line.width !== 0 ? line.width : line.height}px`;
        lineImg.style.top = `${line.y}px`;
        lineImg.style.left = `${line.x}px`;

        $canvas.appendChild(lineImg);
    });
}
const getConnectionLine = (screenA, screenB) => {
    const lineWidth = 12;

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

// ----- swipe ----- //
const determineSwipeAngle = () => {
    const deltaX = swipe.end.x - swipe.start.x;
    const deltaY = swipe.end.y - swipe.start.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) swipe.angle = deltaX > 0 ? 0 : 180;            // horizontal
    else swipe.angle = deltaY > 0 ? 90 : 270;                                               // vertical

}
const handleSwipe = () => {
    determineSwipeAngle();

    const data = { x: swipe.end.x, y: swipe.end.y, angle: swipe.angle };
    console.log(`Swiped in direction:`, data);

    socket.emit(`swipe`, room.code, data, Date.now());
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

// ----- video ----- //
const checkVideoSupport = (type, codecs) => {
    return $video.canPlayType(`video/${type}; codecs="${codecs}"`) !== ""
}
const adjustVideoFormat = (format) => {
    $video.src = `../assets/vid/video-${format}`;
}

// ----- socket ----- //
const connectSocket = () => {
    socket = io.connect(`/`);
    socket.on('connect', () => {
        console.log(`✅ connected to the server`);
        socket.emit(`connectToRoom`, room.code, screenDimensions);
    })

    if (socket) socketListeners();
    else alert(`socket connection not working`);
}
const socketListeners = () => {
    socket.on(`room`, (socketRoom) => {
        room.hostId = socketRoom.host
        updateCoords(socketRoom);
    });

    socket.on(`updateCanvas`, (socketRoom) => {
        room.hostId = socketRoom.host
        updateCoords(socketRoom);
        setCanvas(socketRoom.canvas);
        positionCanvas(socketRoom.clients[socket.id].rotation, myCoords);

        if (socketRoom.clients[socket.id].connected) {
            currentStepIndex = 2;
            updateSteps();
            showConnectionLines();
        }

        const totalClients = Object.keys(socketRoom.clients).length;
        const totalConnectedClients = Object.keys(Object.values(socketRoom.clients).filter((client) => {
            if (client.connected) return client
        })).length;
        if (totalClients === totalConnectedClients) {
            currentPageName = `connect`;
            setTimeout(() => updatePages(), 1000);
        }

        $connectedNumber.textContent = String(totalConnectedClients).padStart(2, '0');
    })

    socket.on(`showDancers`, () => {
        currentPageName = `dancers`;
        updatePages();
    });

    socket.on(`dancerPicked`, (dancer) => {
        showPickedDancer(dancer);
    })

    socket.on(`showDance`, () => {
        currentPageName = `dance`;
        updatePages();
    })

    let danceEndedTimeout;

    socket.on(`danceEnded`, () => {
        clearTimeout(danceEndedTimeout);
        danceEndedTimeout = setTimeout(() => {
            dance.currentDanceIndex++;
            if (dance.currentDanceIndex === dance.totalDances) window.location.href = 'ending.html';
            else {
                currentPageName = 'emotions';
                updatePages();
            }
        }, 1000);
    })

    socket.on('disconnect', () => {
        console.log(`❌ disconnected from the server`);
    })
}

const appInit = () => {
    room.code = getRoomCode();

    connectSocket();

    updateSteps();
    updatePages();

    // ---- steps ---- //
    getDeviceOrientation();
    $appNav.addEventListener(`click`, handleAppNavClick);

    // ----- video ----- //
    if (checkVideoSupport(`mp4`, `hvc1`)) adjustVideoFormat(`hecv.mov`);
    else if (checkVideoSupport(`webm`, `vp9, vorbis`)) adjustVideoFormat(`webm.webm`);
    else console.error(`no browser support`);

    // ----- miscellaneous ----- //
    requestWakeLock();
}

appInit();