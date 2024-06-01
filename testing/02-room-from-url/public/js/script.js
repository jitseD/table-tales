const $myId = document.querySelector(`.my__id`);
const $otherIds = document.querySelector(`.other__ids`);

let socket;

const init = () => {
    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
    });

    socket.on(`clients`, (clientIds) => {
        $otherIds.innerHTML = ``;
        for (const otherSocetId in clientIds) {
            if (clientIds.hasOwnProperty(otherSocetId)) {
                const clientId = clientIds[otherSocetId]
                if (clientId !== socket.id) {
                    const listItem = document.createElement(`li`);
                    listItem.textContent = clientId;
                    $otherIds.appendChild(listItem);
                }
            }
        }
    })
};

init();