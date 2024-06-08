const $videoPlayer = document.querySelector(`.video__player`);
const $videoType = document.querySelector(`.video__type`);

const checkVideoSupport = (type, codecs) => {
    return $videoPlayer.canPlayType(`video/${type}; codecs="${codecs}"`) !== ""
}

const adjustVideoFormat = (format) => {
    $videoPlayer.src = `./assets/vid/test-${format}`;
    $videoType.textContent = format;
}

const init = () => {
    if (checkVideoSupport(`mp4`, `hvc1`)) adjustVideoFormat(`hecv.mov`);
    else if (checkVideoSupport(`webm`, `vp9, vorbis`)) adjustVideoFormat(`webm.webm`);
    else $videoType.textContent = `no browser support`;
}

init();