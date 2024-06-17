import { io } from 'socket.io-client';

let socket;
let roomCode;
let roomHost;
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

    socket = io('https://109.106.244.62:3000', { transports: ['websocket'] })
    socket.on('connect', () => {
        console.log(`✅ connected to the server`);
        socket.emit(`connectToRoom`, roomCode, screenDimensions)
    })

    socket.on('clients', (clients) => console.log(clients));
    socket.on(`room`, (room) => setRoomHost(room.host))

    socket.on('disconnect', () => {
        console.log(`❌ disconnected from the server`);
    })
}

socketInit();
