const $video = document.querySelector(`.vid__wrapper--ending`);

const handleVideoClick = () => {
    $video.classList.toggle(`paused`);
}

const endingInit = () => {
    $video.addEventListener(`click`, handleVideoClick);
}

endingInit();