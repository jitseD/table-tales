let socket;
let socketIds = [];
let $cursor

const $myId = document.querySelector(`.my__id`);
const $otherIds = document.querySelector(`.other__ids`);
const $initiateDance = document.querySelector(`.initiate__dance`);
const $createDance = document.querySelector(`.create__dance`);
const $joinDance = document.querySelector(`.join__dance`);
const $danceLobby = document.querySelector(`.lobby__dance`);
const $danceCode = document.querySelector(`.dance__code`);
const $formDance = document.querySelector(`.form__dance`);
const $danceForm = document.querySelector(`.dance__form`);
const $danceCodeInput = document.querySelector(`.dance__code--input`);

const createDanceHandle = () => {
    socket.emit(`hostDance`, 6);
    socket.on(`danceCode`, (code) => {
        $initiateDance.classList.add(`hide`);
        $danceLobby.classList.remove(`hide`);
        $danceCode.textContent = code;
    })
}

const joinDanceHandle = () => {
    $initiateDance.classList.add(`hide`);
    $formDance.classList.remove(`hide`);
}

const danceFormSubmitHandle = e => {
    e.preventDefault();
    const danceCode = $danceCodeInput.value.trim();
    if (danceCode !== ``) {
        socket.emit(`joinDance`, danceCode);
    } else {
        console.log($danceCodeInput.value);
        console.log(`please enter a dance code`);
    }

    socket.on(`joinedDance`, (code) => {
        $danceForm.classList.add(`hide`);
        $danceLobby.classList.remove(`hide`);
        $danceCode.textContent = code;
    })

    socket.on(`invalidCode`, () => {
        console.log(`code not valid: please enter a valis dance code`);
    })
}

const init = () => {
    socket = io.connect(`/`);
    socket.on(`connect`, () => {
        $myId.textContent = socket.id;
    });

    socket.on(`clientList`, (clientIds) => {
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

    $createDance.addEventListener(`click`, createDanceHandle);
    $joinDance.addEventListener(`click`, joinDanceHandle);
    $danceForm.addEventListener(`submit`, danceFormSubmitHandle);
};

init();