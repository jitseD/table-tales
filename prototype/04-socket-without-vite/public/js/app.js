import { getRoomCode, getExtremeCoords } from './shared/utils.js';

// ----- selectors ----- //
const $pages = document.querySelectorAll(`.page`);
const $steps = document.querySelectorAll(`.section--step`);
const $appNav = document.querySelector(`.app__back`);

// ----- global variables ----- //
let socket;
const room = { code: null, hostId: null };
let currentStepIndex = 1;
let isPhoneDown = false;
let timeout;
const screenDimensions = { height: innerHeight, width: innerWidth };
const swipe = { start: { x: null, y: null }, end: { x: null, y: null }, angle: null, isSwiping: false, isMouseDown: false, }

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
}

// ----- steps ----- //
const handleOrientationEvent = e => {
    const threshold = 5;

    if (Math.abs(e.beta) < threshold) {
        if (!isPhoneDown) {
            isPhoneDown = true;
            console.log("Phone placed down");
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentStepIndex = 1;
                updateSteps();
            }, 500);
        }
    } else {
        if (isPhoneDown) {
            isPhoneDown = false;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentStepIndex = 0;
                updateSteps()
            }, 500);
        }
    }
}
const getDeviceOrientation = async () => {
    if (typeof DeviceOrientationEvent != 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState) window.addEventListener('deviceorientation', handleOrientationEvent);
            else console.error(`permission not granted`);
        } catch (error) {
            console.error(error);
        }
    } else if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientationEvent);
    } else console.error('not suppoerted');
}
const handleAppNavClick = () => {
    if (currentStepIndex === 0) {
        window.location.href = 'index.html';
    } else {
        currentStepIndex--;
        updateSteps();
    }
}

// ----- socket ----- //
const socketInit = () => {
    connectSocket();
    if (socket) {
        socket.on('clients', (clients) => console.log(clients));
        socket.on(`room`, (room) => setRoomHost(room.host));

        socket.on(`updateCanvas`, (room) => {
            if (room.clients[socket.id].connected) {
                currentStepIndex = 2;
                updateSteps();
            }
        })

        socket.on('disconnect', () => {
            console.log(`❌ disconnected from the server`);
        })
    }
}
const connectSocket = () => {
    // socket = io.connect('https://localhost:443', { transports: ['websocket'] });
    socket = io.connect(`/`);
    socket.on('connect', () => {
        alert(socket.id);
        console.log(`✅ connected to the server`);
        socket.emit(`connectToRoom`, room.code, screenDimensions);
    })
}
const setRoomHost = (hostId) => {
    console.log(hostId);
    if (hostId === socket.id) room.hostId = true;
    else room.hostId = false;
}

// ----- connect phones ----- //
const connectPhones = () => {
    const $body = document.querySelector(`.canvas`);

    if (currentStepIndex > 0) {
        $body.addEventListener(`mousedown`, handleMouseDown);
        $body.addEventListener(`mousemove`, handleMouseMove);
        $body.addEventListener(`mouseup`, handleMouseUp);

        $body.addEventListener(`touchstart`, handleTouchStart);
        $body.addEventListener(`touchmove`, handleTouchMove);
        $body.addEventListener(`touchend`, handleTouchEnd);
    }
}

// ----- mouse events ----- //
const handleMouseDown = e => {
    swipe.start = { x: e.clientX, y: e.clientY }
    swipe.isMouseDown = true;
    console.log(e);

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

    const data = { x: swipe.end.x, y: swipe.end.y, angle: swipe.angle };
    console.log(`Swiped in direction:`, data);

    socket.emit(`swipe`, room.code, data, Date.now());
}

const appInit = () => {
    room.code = getRoomCode();
    socketInit();
    connectPhones();

    getDeviceOrientation();
    $appNav.addEventListener(`click`, handleAppNavClick);
}

appInit();