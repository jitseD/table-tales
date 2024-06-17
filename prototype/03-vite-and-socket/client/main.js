import { io } from 'socket.io-client';

const $myId = document.querySelector('.myId');
const $otherIds = document.querySelector('.otherIds');

let socket;

const init = () => {
    socket = io('https://localhost:443', { transports: ['websocket'] })

    socket.on('connect', () => {
        console.log(`✅ connected to the server`);
        $myId.textContent = socket.id;
    })

    socket.on('clients', (clients) => {
        console.log(clients);
        $otherIds.innerHTML = '';
        for (const client in clients) {
            if (client !== socket.id) {
                const $otherId = document.createElement('li');
                $otherId.textContent = client;
                $otherIds.appendChild($otherId);
            }
        }
    })

    socket.on('disconnect', () => {
        console.log(`❌ disconnected from the server`);
    })
};

init();
