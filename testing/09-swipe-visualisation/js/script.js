const $canvas = document.querySelector(`.canvas`);
const swipes = [];
let currentSwipe
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
const screenDimensions = { height: innerHeight, width: innerWidth };

// ----- calculation functions ----- //
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
}

// ----- mouse events ----- //
const handleMouseDown = e => {
    startSwipe(e.clientX, e.clientY);
    currentSwipe.isMouseDown = true;
}
const handleMouseMove = e => {
    if (!currentSwipe || !currentSwipe.isMouseDown) {
        currentSwipe = null;
        return
    }
    moveSwipe(e.clientX, e.clientY);
};
const handleMouseUp = e => {
    endSwipe(e.clientX, e.clientY)
}

// ----- touch events ----- //
const handleTouchStart = e => {
    startSwipe(e.touches[0].clientX, e.touches[0].clientY);
}
const handleTouchMove = e => {
    e.preventDefault();
    moveSwipe(e.touches[0].clientX, e.touches[0].clientY);
}
const handleTouchEnd = e => {
    e.preventDefault();
    endSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
}

// ----- swipe ----- //
class Swipe {
    constructor(start, end) {
        this.start = start;
        this.end = end;
        this.timestamp = null;
        this.opacity = 1;
        this.isMouseDown = false;
        this.isSwiping = false;
        this.points = [];
    }

    show() {
        canvas.ctx.strokeStyle = `rgba(0, 0, 0, ${this.opacity})`;

        canvas.ctx.beginPath();
        canvas.ctx.moveTo(this.start.x, this.start.y);
        this.points.forEach((point) => {
            canvas.ctx.lineTo(point.x, point.y);
        })
        canvas.ctx.stroke();

        canvas.ctx.fillStyle = `white`;
        canvas.ctx.beginPath();
        canvas.ctx.arc(this.end.x, this.end.y, 10, 0, Math.PI * 2);
        canvas.ctx.fill();
        canvas.ctx.stroke();
    }

    calulateOpacity() {
        this.opacity = 1 - ((Date.now() - this.timestamp) / 5000);
    }
}
const startSwipe = (x, y) => {
    const start = { x, y };
    const end = { x: clampValue(x, 0, screenDimensions.width), y: clampValue(y, 0, screenDimensions.height) };
    currentSwipe = new Swipe(start, end);
}
const moveSwipe = (x, y) => {
    if (!currentSwipe) {
        currentSwipe = null;
        return
    }
    if (!currentSwipe.isSwiping) currentSwipe.isSwiping = true;

    const point = {
        x: clampValue(x, 0, screenDimensions.width),
        y: clampValue(y, 0, screenDimensions.height)
    };
    currentSwipe.points.push(point);
    currentSwipe.end = point;
}
const endSwipe = (x, y) => {
    if (!currentSwipe || !currentSwipe.isSwiping) {
        currentSwipe = null;
        return
    };

    currentSwipe.end = {
        x: Math.round(clampValue(x, 0, screenDimensions.width)),
        y: Math.round(clampValue(y, 0, screenDimensions.height)),
    }
    currentSwipe.timestamp = Date.now();
    currentSwipe.isSwiping = false;
    currentSwipe.isMouseDown = false;

    swipes.push(currentSwipe);
}
const visualizeSwipes = () => {
    // console.log(swipes);
    canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);

    swipes.forEach((currentSwipe, i) => {
        currentSwipe.calulateOpacity();
        if (currentSwipe.opacity <= 0) swipes.splice(i, 1)
        else currentSwipe.show();
    });

    if (currentSwipe && currentSwipe.isSwiping) currentSwipe.show();

    requestAnimationFrame(visualizeSwipes);
}

const init = () => {
    // ----- canvas ----- //
    createCanvas();
    visualizeSwipes();

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