// ----- room code ----- //
const getUrlParameter = (name) => {
    name = name.replace(/[\[]/, `\\[`).replace(/[\]]/, `\\]`);
    const regex = new RegExp(`[\\?&]` + name + `=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? false : decodeURIComponent(results[1].replace(/\+/g, ` `));
}
export const getRoomCode = () => {
    let roomCode = getUrlParameter(`room`);
    if (roomCode) {
        localStorage.setItem('roomCode', roomCode)
    } else {
        roomCode = localStorage.getItem('roomCode')
        if (!roomCode) {
            alert(`Please add a room code in the URL with the following format: ?room=${roomCode}`)
        }
    }
    return roomCode
}

// ----- calculations ----- //
export const getExtremeCoords = (coords) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    coords.forEach(({ x, y }) => {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    })

    return { minX, minY, maxX, maxY };
}