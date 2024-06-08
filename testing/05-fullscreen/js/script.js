const $fullscreenAction = document.querySelector(`.fullscreen__action`);
const $supported = document.querySelector(`.supported`);
const $notSupported = document.querySelector(`.notSupported`);

const isFullscreenSupported = () => {
    return document.fullscreenEnabled
        || document.webkitFullscreenEnabled
        || document.mozFullScreenEnabled
        || document.msFullscreenEnabled;
};

const fullscreenNotSupported = () => {
    $supported.classList.add(`hide`);
    $notSupported.classList.remove(`hide`);
}

const isFullscreen = () => {
    return document.fullscreenElement
        || document.webkitFullscreenElement
        || document.mozFullScreenElement
        || document.msFullscreenElement;
};

const toggleFullscreen = () => {
    const element = document.documentElement;

    if (!isFullscreen()) {
        element.requestFullscreen().catch(e => {
            console.error(e);
        })
        $fullscreenAction.textContent = `exit`;
    } else {
        document.exitFullscreen();
        $fullscreenAction.textContent = `go`;
    }
}

const init = () => {
    if (isFullscreenSupported()) document.addEventListener(`dblclick`, toggleFullscreen);
    else fullscreenNotSupported();
}

init();