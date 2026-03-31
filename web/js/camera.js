import { POLE_HEIGHT, FLAG_HEIGHT } from './config.js';

export const cam = {
    theta: 0.5,
    phi: 0.25,
    dist: 5.5,
    dragging: false,
    lastMX: 0,
    lastMY: 0,
    target: new Float32Array([1.0, POLE_HEIGHT - FLAG_HEIGHT * 0.5, 0.3])
};

export function getEye(out) {
    out[0] = cam.target[0] + cam.dist * Math.sin(cam.theta) * Math.cos(cam.phi);
    out[1] = cam.target[1] + cam.dist * Math.sin(cam.phi);
    out[2] = cam.target[2] + cam.dist * Math.cos(cam.theta) * Math.cos(cam.phi);
}

function updateOrbit(x, y) {
    cam.theta -= (x - cam.lastMX) * 0.005;
    cam.phi += (y - cam.lastMY) * 0.005;
    cam.phi = Math.max(-1.2, Math.min(1.2, cam.phi));
    cam.lastMX = x;
    cam.lastMY = y;
}

export function initCameraControls(canvas) {
    canvas.addEventListener('mousedown', e => {
        cam.dragging = true; cam.lastMX = e.clientX; cam.lastMY = e.clientY;
    });
    window.addEventListener('mouseup', () => cam.dragging = false);
    window.addEventListener('mousemove', e => {
        if (cam.dragging) updateOrbit(e.clientX, e.clientY);
    });
    canvas.addEventListener('wheel', e => {
        cam.dist *= 1 + e.deltaY * 0.001;
        cam.dist = Math.max(2, Math.min(20, cam.dist));
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            cam.dragging = true;
            cam.lastMX = e.touches[0].clientX;
            cam.lastMY = e.touches[0].clientY;
        }
    }, { passive: true });
    canvas.addEventListener('touchend', () => cam.dragging = false);
    canvas.addEventListener('touchmove', e => {
        if (cam.dragging && e.touches.length === 1) {
            updateOrbit(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });
}
