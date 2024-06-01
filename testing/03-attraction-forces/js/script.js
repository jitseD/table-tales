const $canvas = document.querySelector(`.canvas`);
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
let square = { x: 50, y: 50, size: 50, dx: 5, dy: 5, fill: `black` };

const createCanvas = () => {
    canvas.ctx = $canvas.getContext(`2d`);
    const scale = window.devicePixelRatio;
    $canvas.width = Math.floor(canvas.width * scale);
    $canvas.height = Math.floor(canvas.height * scale);
    canvas.ctx.scale(scale, scale);
    $canvas.style.width = `${canvas.width}px`;
    $canvas.style.height = `${canvas.height}px`;
    animateSquare();
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

const init = () => {
    createCanvas();
}

init();