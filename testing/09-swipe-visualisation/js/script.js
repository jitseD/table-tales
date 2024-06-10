const $canvas = document.querySelector(`.canvas`);

const swipe = {
    start: { x: null, y: null },
    end: { x: null, y: null },
    angle: null,
    isSwiping: false,
    isMouseDown: false,
}
const canvas = { ctx: null, height: innerHeight, width: innerWidth };

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

// ----- mouse events ----- //
const handleMouseDown = e => {
    swipe.start = { x: e.clientX, y: e.clientY }
    swipe.isMouseDown = true;
}
const handleMouseMove = e => {
    if (!swipe.isMouseDown) return;
    swipe.isSwiping = true;

    swipe.end = { x: e.clientX, y: e.clientY };
    visualizeSwipe();
};
const handleMouseUp = e => {
    swipe.isMouseDown = false;
    if (!swipe.isSwiping) return;

    swipe.end = { x: e.clientX, y: e.clientY };
    swipe.timestamp = Date.now();
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

    swipe.end = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    visualizeSwipe();
}
const handleTouchEnd = e => {
    e.preventDefault();
    if (!swipe.isSwiping) return;

    swipe.end = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
    swipe.isSwiping = false;
}

// ----- swipe ----- //
const visualizeSwipe = () => {
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.ctx.beginPath();
    canvas.ctx.moveTo(swipe.start.x, swipe.start.y);
    canvas.ctx.lineTo(swipe.end.x, swipe.end.y);
    canvas.ctx.stroke();

    canvas.ctx.fillStyle = `white`;
    canvas.ctx.beginPath();
    canvas.ctx.arc(swipe.end.x, swipe.end.y, 10, 0, Math.PI * 2);
    canvas.ctx.fill();
    canvas.ctx.stroke();
}

const init = () => {
    // ----- canvas ----- //
    createCanvas();

    // ----- mouse events ----- //
    $canvas.addEventListener('mousedown', handleMouseDown);
    $canvas.addEventListener('mousemove', handleMouseMove);
    $canvas.addEventListener('mouseup', handleMouseUp);

    // ----- touch events ----- //
    $canvas.addEventListener('touchstart', handleTouchStart);
    $canvas.addEventListener('touchmove', handleTouchMove);
    $canvas.addEventListener('touchend', handleTouchEnd);
};

init();