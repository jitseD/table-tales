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
    if (isFullscreen()) exitFullscreen();
    else enterFullscreen();
}

const enterFullscreen = () => {
    const element = document.documentElement;

    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
    else if (element.mozRequestFullScreen) element.mozRequestFullScreen();
    else if (element.msRequestFullscreen) element.msRequestFullscreen();
};

const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
};

const handleFullscreenChange = () => {
    $fullscreenAction.textContent = isFullscreen() ? 'exit' : 'go';
};

const init = () => {
    if (!isFullscreenSupported()) return fullscreenNotSupported();

    document.addEventListener(`dblclick`, toggleFullscreen)

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

init();