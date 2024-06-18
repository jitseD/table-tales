const $steps = document.querySelectorAll(`.section--step`);

let isPhoneDown = false;
let timeout;

const handleOrientationEvent = e => {
    const threshold = 5;

    if (Math.abs(e.beta) < threshold) {
        if (!isPhoneDown) {
            isPhoneDown = true;
            console.log("Phone placed down");
            clearTimeout(timeout);
            timeout = setTimeout(() => updateSteps(1), 500);
        }
    } else {
        if (isPhoneDown) {
            isPhoneDown = false;
            clearTimeout(timeout);
            timeout = setTimeout(() => updateSteps(0), 500);
        }
    }
}

const updateSteps = (stepIndex) => {
    $steps.forEach(step => step.classList.remove(`visible`));
    $steps[stepIndex].classList.add(`visible`);
}

const getDeviceOrientation = async () => {
    if (typeof DeviceOrientationEvent != 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceOrientationEvent.requestPermission();
            if (permissionState) window.addEventListener('deviceorientation', handleOrientationEvent);
            else console.error(`permission not granted`);
        } catch (error) {
            console.error(error);
        }
    } else if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientationEvent)
    } else console.error('not suppoerted');
}

const stepsInit = () => {
    getDeviceOrientation();
}

stepsInit();