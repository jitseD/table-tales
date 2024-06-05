const $myId = document.querySelector(`.my__id`);

let socket;

const init = () => {
    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
    });
};

init();