import {
    COLS, ROWS, N, FLAG_WIDTH, FLAG_HEIGHT, POLE_HEIGHT,
    GRAVITY, DAMPING, SUBSTEPS, CONSTRAINT_ITERS, DRAG_COEFF,
    CLOTH_THICKNESS
} from './config.js';

const dx = FLAG_WIDTH / (COLS - 1);
const dy = FLAG_HEIGHT / (ROWS - 1);
const HASH_SIZE = 4096;
const HASH_CELL = CLOTH_THICKNESS * 2.5;

const _d1 = new Float32Array(3);
const _d2 = new Float32Array(3);
const _cross = new Float32Array(3);
const _hashCount = new Int32Array(HASH_SIZE);
const _hashStart = new Int32Array(HASH_SIZE);
const _hashOrder = new Int32Array(N);
const _hashKeys = new Int32Array(N);

export const cloth = {
    pos: null, prevPos: null, pinned: null,
    springA: [], springB: [], springRest: [],
    forces: null, normals: null
};

export function initCloth() {
    cloth.pos = new Float32Array(N * 3);
    cloth.prevPos = new Float32Array(N * 3);
    cloth.pinned = new Uint8Array(N);
    cloth.forces = new Float32Array(N * 3);
    cloth.normals = new Float32Array(N * 3);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const i = (r * COLS + c) * 3;
            cloth.pos[i] = c * dx;
            cloth.pos[i + 1] = POLE_HEIGHT - r * dy;
            cloth.pos[i + 2] = (Math.random() - 0.5) * 0.02;
            cloth.prevPos[i] = cloth.pos[i];
            cloth.prevPos[i + 1] = cloth.pos[i + 1];
            cloth.prevPos[i + 2] = cloth.pos[i + 2];
            if (c === 0) cloth.pinned[r * COLS + c] = 1;
        }
    }

    cloth.springA.length = cloth.springB.length = cloth.springRest.length = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            if (c < COLS - 1) addSpring(idx, idx + 1, dx);
            if (r < ROWS - 1) addSpring(idx, idx + COLS, dy);
            if (c < COLS - 1 && r < ROWS - 1) addSpring(idx, idx + COLS + 1, Math.hypot(dx, dy));
            if (c > 0 && r < ROWS - 1) addSpring(idx, idx + COLS - 1, Math.hypot(dx, dy));
            if (c < COLS - 2) addSpring(idx, idx + 2, 2 * dx);
            if (r < ROWS - 2) addSpring(idx, idx + 2 * COLS, 2 * dy);
        }
    }
}

function addSpring(a, b, rest) {
    cloth.springA.push(a);
    cloth.springB.push(b);
    cloth.springRest.push(rest);
}

export function stepCloth(dt, time, wind) {
    const angle = wind.angle * Math.PI / 180;
    const windBase = [Math.sin(angle) * wind.speed, 0, Math.cos(angle) * wind.speed];
    const subDt = dt / SUBSTEPS;
    const { pos, prevPos, pinned, forces } = cloth;

    for (let s = 0; s < SUBSTEPS; s++) {
        forces.fill(0);
        for (let i = 0; i < N; i++) forces[i * 3 + 1] = GRAVITY;

        const t = time + s * subDt;
        for (let r = 0; r < ROWS - 1; r++) {
            for (let c = 0; c < COLS - 1; c++) {
                const i0 = r * COLS + c;
                applyWindTri(i0, i0 + 1, i0 + COLS, windBase, wind.turb, t);
                applyWindTri(i0 + 1, i0 + COLS + 1, i0 + COLS, windBase, wind.turb, t);
            }
        }

        const dt2 = subDt * subDt;
        for (let i = 0; i < N; i++) {
            if (pinned[i]) continue;
            const ix = i * 3, iy = ix + 1, iz = ix + 2;
            const vx = pos[ix] - prevPos[ix], vy = pos[iy] - prevPos[iy], vz = pos[iz] - prevPos[iz];
            prevPos[ix] = pos[ix]; prevPos[iy] = pos[iy]; prevPos[iz] = pos[iz];
            pos[ix] += vx * DAMPING + forces[ix] * dt2;
            pos[iy] += vy * DAMPING + forces[iy] * dt2;
            pos[iz] += vz * DAMPING + forces[iz] * dt2;
        }

        solveConstraints();
        selfCollide();
    }
}

function triEdgesAndCross(i0, i1, i2) {
    const p = cloth.pos;
    const ax = i0 * 3, bx = i1 * 3, cx = i2 * 3;
    _d1[0] = p[bx] - p[ax]; _d1[1] = p[bx + 1] - p[ax + 1]; _d1[2] = p[bx + 2] - p[ax + 2];
    _d2[0] = p[cx] - p[ax]; _d2[1] = p[cx + 1] - p[ax + 1]; _d2[2] = p[cx + 2] - p[ax + 2];
    _cross[0] = _d1[1] * _d2[2] - _d1[2] * _d2[1];
    _cross[1] = _d1[2] * _d2[0] - _d1[0] * _d2[2];
    _cross[2] = _d1[0] * _d2[1] - _d1[1] * _d2[0];
}

function applyWindTri(i0, i1, i2, windBase, turb, t) {
    triEdgesAndCross(i0, i1, i2);
    const clen = Math.hypot(_cross[0], _cross[1], _cross[2]);
    if (clen < 1e-8) return;
    const nx = _cross[0] / clen, ny = _cross[1] / clen, nz = _cross[2] / clen;
    const p = cloth.pos;
    const p0x = p[i0 * 3], p0y = p[i0 * 3 + 1], p0z = p[i0 * 3 + 2];
    const tx = turb * Math.sin(t * 1.7 + p0x * 2.1) * Math.cos(t * 0.9 + p0z * 1.3);
    const ty = turb * Math.cos(t * 2.3 + p0y * 1.8) * Math.sin(t * 1.1) * 0.3;
    const tz = turb * Math.sin(t * 1.3 + p0x * 1.5) * Math.cos(t * 1.5 + p0y * 0.7);
    const wx = windBase[0] + tx, wy = windBase[1] + ty, wz = windBase[2] + tz;
    const wdn = wx * nx + wy * ny + wz * nz;
    const area = clen * 0.5;
    const f = DRAG_COEFF * area * wdn / 3;
    const fx = f * nx, fy = f * ny, fz = f * nz;
    const forces = cloth.forces;
    for (const idx of [i0, i1, i2]) {
        forces[idx * 3] += fx; forces[idx * 3 + 1] += fy; forces[idx * 3 + 2] += fz;
    }
}

function solveConstraints() {
    const { pos, pinned, springA, springB, springRest } = cloth;
    for (let iter = 0; iter < CONSTRAINT_ITERS; iter++) {
        for (let j = 0; j < springA.length; j++) {
            const a = springA[j], b = springB[j], rest = springRest[j];
            const ax = a * 3, bx = b * 3;
            let ex = pos[bx] - pos[ax], ey = pos[bx + 1] - pos[ax + 1], ez = pos[bx + 2] - pos[ax + 2];
            const len = Math.hypot(ex, ey, ez);
            if (len < 1e-7) continue;
            const diff = (len - rest) / len * 0.5;
            ex *= diff; ey *= diff; ez *= diff;
            if (!pinned[a]) { pos[ax] += ex; pos[ax + 1] += ey; pos[ax + 2] += ez; }
            if (!pinned[b]) { pos[bx] -= ex; pos[bx + 1] -= ey; pos[bx + 2] -= ez; }
        }
    }
}

function cellHash(cx, cy, cz) {
    return ((cx * 73856093 + cy * 19349663 + cz * 83492791) >>> 0) % HASH_SIZE;
}

function selfCollide() {
    const { pos, pinned } = cloth;
    const minDist2 = CLOTH_THICKNESS * CLOTH_THICKNESS;

    for (let i = 0; i < N; i++) {
        _hashKeys[i] = cellHash(
            Math.floor(pos[i * 3] / HASH_CELL),
            Math.floor(pos[i * 3 + 1] / HASH_CELL),
            Math.floor(pos[i * 3 + 2] / HASH_CELL)
        );
    }
    _hashCount.fill(0);
    for (let i = 0; i < N; i++) _hashCount[_hashKeys[i]]++;
    let sum = 0;
    for (let i = 0; i < HASH_SIZE; i++) { const c = _hashCount[i]; _hashStart[i] = sum; sum += c; }
    _hashCount.fill(0);
    for (let i = 0; i < N; i++) {
        const key = _hashKeys[i];
        _hashOrder[_hashStart[key] + _hashCount[key]++] = i;
    }

    for (let i = 0; i < N; i++) {
        const ix = i * 3;
        const px = pos[ix], py = pos[ix + 1], pz = pos[ix + 2];
        const bx = Math.floor(px / HASH_CELL), by = Math.floor(py / HASH_CELL), bz = Math.floor(pz / HASH_CELL);
        for (let ddx = -1; ddx <= 1; ddx++) for (let ddy = -1; ddy <= 1; ddy++) for (let ddz = -1; ddz <= 1; ddz++) {
            const key = cellHash(bx + ddx, by + ddy, bz + ddz);
            const start = _hashStart[key], end = start + _hashCount[key];
            for (let k = start; k < end; k++) {
                const j = _hashOrder[k];
                if (j <= i) continue;
                const ri = (i / COLS) | 0, ci = i % COLS, rj = (j / COLS) | 0, cj = j % COLS;
                if (Math.abs(ri - rj) <= 2 && Math.abs(ci - cj) <= 2) continue;
                const jx = j * 3;
                const ex = pos[jx] - px, ey = pos[jx + 1] - py, ez = pos[jx + 2] - pz;
                const d2 = ex * ex + ey * ey + ez * ez;
                if (d2 < minDist2 && d2 > 1e-10) {
                    const d = Math.sqrt(d2);
                    const corr = (CLOTH_THICKNESS - d) / d * 0.5;
                    const cx2 = ex * corr, cy2 = ey * corr, cz2 = ez * corr;
                    if (!pinned[i]) { pos[ix] -= cx2; pos[ix + 1] -= cy2; pos[ix + 2] -= cz2; }
                    if (!pinned[j]) { pos[jx] += cx2; pos[jx + 1] += cy2; pos[jx + 2] += cz2; }
                }
            }
        }
    }
}

export function computeNormals() {
    cloth.normals.fill(0);
    for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS - 1; c++) {
            const i0 = r * COLS + c;
            addFaceNormal(i0, i0 + 1, i0 + COLS);
            addFaceNormal(i0 + 1, i0 + COLS + 1, i0 + COLS);
        }
    }
    for (let i = 0; i < N; i++) {
        const ix = i * 3;
        let len = Math.hypot(cloth.normals[ix], cloth.normals[ix + 1], cloth.normals[ix + 2]);
        if (len < 1e-8) len = 1;
        cloth.normals[ix] /= len; cloth.normals[ix + 1] /= len; cloth.normals[ix + 2] /= len;
    }
}

function addFaceNormal(i0, i1, i2) {
    triEdgesAndCross(i0, i1, i2);
    const n = cloth.normals;
    for (const i of [i0, i1, i2]) {
        n[i * 3] += _cross[0]; n[i * 3 + 1] += _cross[1]; n[i * 3 + 2] += _cross[2];
    }
}
