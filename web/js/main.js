import { PHYS_DT } from './config.js';
import { initCloth, stepCloth, computeNormals } from './cloth.js';
import { initRenderer, resize, uploadClothBuffers, renderScene } from './renderer.js';
import { initCameraControls } from './camera.js';
import { initControls, wind } from './controls.js';

const canvas = document.getElementById('canvas');

initRenderer(canvas);
initCameraControls(canvas);
initControls();
initCloth();

function resizeHandler() { resize(canvas); }
window.addEventListener('resize', resizeHandler);
resizeHandler();

const timing = { lastTime: 0, simTime: 0, accumulator: 0 };

function frame(timestamp) {
    requestAnimationFrame(frame);

    const dt = Math.min((timestamp - timing.lastTime) / 1000, 0.05);
    timing.lastTime = timestamp;
    timing.accumulator += dt;

    while (timing.accumulator >= PHYS_DT) {
        stepCloth(PHYS_DT, timing.simTime, wind);
        timing.simTime += PHYS_DT;
        timing.accumulator -= PHYS_DT;
    }

    computeNormals();
    uploadClothBuffers();
    renderScene(canvas);
}

requestAnimationFrame(frame);
