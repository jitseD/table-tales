const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            if (err.name != 'NotAllowedError') console.error(`${err.name}, ${err.message}`);
        }
    }
}
const init = () => {
    requestWakeLock();
}
init();