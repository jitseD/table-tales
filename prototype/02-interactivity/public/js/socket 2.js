let roomCode, roomHost;
let socket;
const screenDimensions = { height: innerHeight, width: innerWidth };

// ----- miscellaneous ----- //
const getUrlParameter = (name) => {
    name = name.replace(/[\[]/, `\\[`).replace(/[\]]/, `\\]`);
    const regex = new RegExp(`[\\?&]` + name + `=([^&#]*)`);
    const results = regex.exec(location.search);
    return results === null ? false : decodeURIComponent(results[1].replace(/\+/g, ` `));
}
const setRoomHost = (hostId) => {
    console.log(hostId);
    if (hostId === socket.id) roomHost = true;
    else roomHost = false;
}

const socketInit = () => {
    roomCode = getUrlParameter(`room`);

    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        console.log(`✅ connected`);
        socket.emit(`connectToRoom`, roomCode, screenDimensions)
    })
    socket.on(`room`, (room) => setRoomHost(room.host))
}

socketInit();