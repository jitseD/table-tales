const $canvas = document.querySelector(`.canvas`);
const canvas = { ctx: null, height: innerHeight, width: innerWidth };
let square;

const randomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

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

    square.update();
    square.checkEdges();
    square.show();

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

    mult(n) {
        this.x = this.x * n;
        this.y = this.y * n;
    }

    div(n) {
        this.x = this.x / n;
        this.y = this.y / n;
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
    constructor() {
        this.size = 50;
        this.pos = new Vector(randomNumber(0, canvas.width - this.size), randomNumber(0, canvas.height - this.size));
        this.vel = new Vector(0, 0);
        this.acc = new Vector(randomNumber(1, 10) / 100, randomNumber(1, 10) / 100);
        this.topSpeed = 20;
        this.fill = `black`;
    }

    update() {
        this.vel.add(this.acc);
        this.pos.add(this.vel);

        this.vel.limit(this.topSpeed);
        console.log(this.vel);
    }

    show() {
        canvas.ctx.fillStyle = this.fill;
        canvas.ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
    }

    checkEdges() {
        if (this.pos.x + this.size > canvas.width) {
            this.pos.x = canvas.width - this.size;
            this.vel.x *= -1;
            this.acc.x *= -1;
        } else if (this.pos.x < 0) {
            this.pos.x = 0;
            this.vel.x *= -1;
            this.acc.x *= -1;
        }

        if (this.pos.y + this.size > canvas.height) {
            this.pos.y = canvas.height - this.size;
            this.vel.y *= -1;
            this.acc.y *= -1;
        } else if (this.pos.y < 0) {
            this.pos.y = 0;
            this.vel.y *= -1;
            this.acc.y *= -1;
        }
    }
}

const init = () => {
    createCanvas();
    square = new Mover();

    animateSquare();
}

init();