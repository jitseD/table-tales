const $fullscreenAction = document.querySelector(`.fullscreen__action`);
let fullscreen = false;

const toggleFullscreen = () => {
    const element = document.documentElement;

    if (!fullscreen) {
        element.requestFullscreen().catch(e => {
            console.error(e);
        })
        $fullscreenAction.textContent = `exit`;
    } else {
        document.exitFullscreen();
        $fullscreenAction.textContent = `go`;
    }

    fullscreen = !fullscreen;
}

const init = () => {
    document.addEventListener(`dblclick`, toggleFullscreen);
}

init();