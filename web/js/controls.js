import { initCloth } from './cloth.js';

export const wind = { speed: 5, angle: 0, turb: 0.5 };

export function initControls() {
    bindSlider('windSpeed', 'speedVal', 'speed', v => parseFloat(v).toFixed(1));
    bindSlider('windDir', 'dirVal', 'angle', v => v + '\u00B0');
    bindSlider('turbulence', 'turbVal', 'turb', v => parseFloat(v).toFixed(2));
    document.getElementById('resetBtn').onclick = () => initCloth();
}

function bindSlider(sliderId, displayId, windKey, formatter) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    slider.oninput = function () {
        wind[windKey] = parseFloat(this.value);
        display.innerHTML = formatter(this.value);
    };
}
