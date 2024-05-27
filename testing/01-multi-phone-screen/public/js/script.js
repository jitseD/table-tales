let socket;
let socketIds = [];
let $cursor

const $myId = document.querySelector(`.myId`);
const $otherIds = document.querySelector(`.otherIds`);

const init = () => {
    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
    });

    socket.on(`clientList`, (clientIds) => {
        $otherIds.innerHTML = '';
        clientIds.forEach(clientId => {
            console.log(`socket.id - ` + socket.id);
            console.log(`clientId - ` + clientId);
            if (clientId[0] !== socket.id) {
                const listItem = document.createElement('li');
                listItem.textContent = clientId[0];
                $otherIds.appendChild(listItem);
            }
        });
    })

};

init();