export function mat4Perspective(out, fov, aspect, near, far) {
    out.fill(0);
    const f = 1 / Math.tan(fov / 2);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = 2 * far * near / (near - far);
}

export function mat4LookAt(out, eye, center, up) {
    let fx = center[0] - eye[0], fy = center[1] - eye[1], fz = center[2] - eye[2];
    let len = Math.hypot(fx, fy, fz);
    fx /= len; fy /= len; fz /= len;
    let sx = fy * up[2] - fz * up[1], sy = fz * up[0] - fx * up[2], sz = fx * up[1] - fy * up[0];
    len = Math.hypot(sx, sy, sz);
    sx /= len; sy /= len; sz /= len;
    const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
    out[0] = sx; out[1] = ux; out[2] = -fx; out[3] = 0;
    out[4] = sy; out[5] = uy; out[6] = -fy; out[7] = 0;
    out[8] = sz; out[9] = uz; out[10] = -fz; out[11] = 0;
    out[12] = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
    out[13] = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
    out[14] = fx * eye[0] + fy * eye[1] + fz * eye[2];
    out[15] = 1;
}

export function mat3Normal(out, mv) {
    out[0] = mv[0]; out[1] = mv[1]; out[2] = mv[2];
    out[3] = mv[4]; out[4] = mv[5]; out[5] = mv[6];
    out[6] = mv[8]; out[7] = mv[9]; out[8] = mv[10];
}
