const $canvas = document.querySelector(`.canvas`);
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
let square = { pos: null, vel: null, size: 50, fill: `black` };

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
    canvas.ctx.fillRect(square.pos.x, square.pos.y, square.size, square.size);

    square.pos.x += square.vel.x;
    square.pos.y += square.vel.y;

    if (square.pos.x + square.size > canvas.width || square.pos.x < 0) square.vel.x *= -1;
    if (square.pos.y + square.size > canvas.height || square.pos.y < 0) square.vel.y *= -1;

    requestAnimationFrame(animateSquare);
}

class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        this.x = this.x + vector.x;
        this.y = this.y + vector.y;
    }
}

const init = () => {
    createCanvas();
    square.pos = new Vector(50, 50);
    square.vel = new Vector(5, 5);

    animateSquare();
}

init();