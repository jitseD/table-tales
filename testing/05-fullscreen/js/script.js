const $fullscreen = document.querySelector(`.fullscreen`);

const fullscreenHandle = e => {
    document.documentElement.requestFullscreen().catch((e) => {
        console.error(e);
    })
}

const init = () => {
    $fullscreen.addEventListener(`click`, fullscreenHandle);
}

init();