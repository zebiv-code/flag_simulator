import { COLS, ROWS, POLE_HEIGHT, POLE_RADIUS } from './config.js';

export function buildFlagIndices() {
    const idx = [];
    for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS - 1; c++) {
            const i = r * COLS + c;
            idx.push(i, i + 1, i + COLS, i + 1, i + COLS + 1, i + COLS);
        }
    }
    return new Uint16Array(idx);
}

export function buildFlagUVs() {
    const uv = new Float32Array(ROWS * COLS * 2);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = (r * COLS + c) * 2;
            uv[i] = c / (COLS - 1);
            uv[i + 1] = r / (ROWS - 1);
        }
    }
    return uv;
}

export function buildCylinder(x, z, y0, y1, radius, segs, color) {
    const v = [], n = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const cx = Math.cos(a), sz = Math.sin(a);
        v.push(x + cx * radius, y0, z + sz * radius);
        n.push(cx, 0, sz); uv.push(0, 0);
        v.push(x + cx * radius, y1, z + sz * radius);
        n.push(cx, 0, sz); uv.push(0, 0);
    }
    for (let i = 0; i < segs; i++) {
        const b = i * 2, t = b + 1;
        idx.push(b, b + 2, t, t, b + 2, t + 2);
    }
    return { vertices: new Float32Array(v), normals: new Float32Array(n),
             uvs: new Float32Array(uv), indices: new Uint16Array(idx), color };
}

export function buildSphere(cx, cy, cz, radius, sl, st, color) {
    const v = [], n = [], uv = [], idx = [];
    for (let i = 0; i <= st; i++) {
        const phi = i / st * Math.PI;
        for (let j = 0; j <= sl; j++) {
            const th = j / sl * Math.PI * 2;
            const nx2 = Math.sin(phi) * Math.cos(th);
            const ny2 = Math.cos(phi);
            const nz2 = Math.sin(phi) * Math.sin(th);
            v.push(cx + nx2 * radius, cy + ny2 * radius, cz + nz2 * radius);
            n.push(nx2, ny2, nz2); uv.push(0, 0);
        }
    }
    for (let i = 0; i < st; i++) {
        for (let j = 0; j < sl; j++) {
            const a = i * (sl + 1) + j, b = a + sl + 1;
            idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
    }
    return { vertices: new Float32Array(v), normals: new Float32Array(n),
             uvs: new Float32Array(uv), indices: new Uint16Array(idx), color };
}

export function buildGround() {
    const s = 8;
    return {
        vertices: new Float32Array([-s, 0, -s, s * 2, 0, -s, s * 2, 0, s * 2, -s, 0, s * 2]),
        normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
        uvs: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0]),
        indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
        color: [0.18, 0.42, 0.14]
    };
}

export function buildSceneMeshes() {
    return {
        pole: buildCylinder(0, 0, 0, POLE_HEIGHT + 0.08, POLE_RADIUS, 16, [0.72, 0.72, 0.76]),
        finial: buildSphere(0, POLE_HEIGHT + 0.08 + 0.06, 0, 0.06, 10, 8, [0.85, 0.65, 0.13]),
        ground: buildGround()
    };
}
