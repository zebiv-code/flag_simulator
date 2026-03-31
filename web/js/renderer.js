import { mat4Perspective, mat4LookAt, mat3Normal } from './math.js';
import { getEye } from './camera.js';
import { cloth } from './cloth.js';
import { createFlagTexture } from './flag-texture.js';
import { buildFlagUVs, buildFlagIndices, buildSceneMeshes } from './mesh.js';

const VERT_SRC = `
attribute vec3 aPos;
attribute vec2 aUV;
attribute vec3 aNorm;
uniform mat4 uProj, uMV;
uniform mat3 uNM;
varying vec2 vUV;
varying vec3 vN, vP;
void main(){
    vUV=aUV; vN=uNM*aNorm;
    vec4 p=uMV*vec4(aPos,1.0);
    vP=p.xyz; gl_Position=uProj*p;
}`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vUV;
varying vec3 vN, vP;
uniform sampler2D uTex;
uniform float uUseTex;
uniform vec3 uColor, uLight;
void main(){
    vec3 n=normalize(vN);
    if(!gl_FrontFacing) n=-n;
    vec4 tc=texture2D(uTex,vUV);
    vec4 sc=vec4(uColor,1.0);
    vec4 base=mix(sc,tc,uUseTex);
    float diff=max(dot(n,normalize(uLight)),0.0);
    float light=0.35+0.65*diff;
    gl_FragColor=vec4(base.rgb*light,base.a);
}`;

const _projMat = new Float32Array(16);
const _viewMat = new Float32Array(16);
const _normalMat = new Float32Array(9);
const _eye = new Float32Array(3);
const _up = new Float32Array([0, 1, 0]);
const _lightDir = new Float32Array([0.5, 0.8, 0.6]);

let gl, loc;
let flagPosBuf, flagNormBuf, flagUVBuf, flagIdxBuf;
let flagBufs, poleBufs, finialBufs, groundBufs;
let flagTex, flagIndexCount;

export function initRenderer(canvas) {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) throw new Error('WebGL not supported');

    const vs = compileShader(VERT_SRC, gl.VERTEX_SHADER);
    const fs = compileShader(FRAG_SRC, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    loc = {
        aPos: gl.getAttribLocation(prog, 'aPos'),
        aUV: gl.getAttribLocation(prog, 'aUV'),
        aNorm: gl.getAttribLocation(prog, 'aNorm'),
        uProj: gl.getUniformLocation(prog, 'uProj'),
        uMV: gl.getUniformLocation(prog, 'uMV'),
        uNM: gl.getUniformLocation(prog, 'uNM'),
        uTex: gl.getUniformLocation(prog, 'uTex'),
        uUseTex: gl.getUniformLocation(prog, 'uUseTex'),
        uColor: gl.getUniformLocation(prog, 'uColor'),
        uLight: gl.getUniformLocation(prog, 'uLight'),
    };

    // Flag buffers
    flagPosBuf = gl.createBuffer();
    flagNormBuf = gl.createBuffer();
    flagUVBuf = gl.createBuffer();
    flagIdxBuf = gl.createBuffer();

    const flagUVs = buildFlagUVs();
    const flagIndices = buildFlagIndices();
    flagIndexCount = flagIndices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, flagUVBuf);
    gl.bufferData(gl.ARRAY_BUFFER, flagUVs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, flagIdxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, flagIndices, gl.STATIC_DRAW);

    // Flag texture
    flagTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, flagTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createFlagTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Scene meshes
    const meshes = buildSceneMeshes();
    poleBufs = createMeshBufs(meshes.pole);
    finialBufs = createMeshBufs(meshes.finial);
    groundBufs = createMeshBufs(meshes.ground);
    flagBufs = { pos: flagPosBuf, norm: flagNormBuf, uv: flagUVBuf,
                 idx: flagIdxBuf, count: flagIndexCount, color: [1, 1, 1] };
}

export function resize(canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

export function uploadClothBuffers() {
    gl.bindBuffer(gl.ARRAY_BUFFER, flagPosBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cloth.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, flagNormBuf);
    gl.bufferData(gl.ARRAY_BUFFER, cloth.normals, gl.DYNAMIC_DRAW);
}

export function renderScene(canvas) {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    const aspect = canvas.width / canvas.height;
    mat4Perspective(_projMat, Math.PI / 4.5, aspect, 0.1, 100);
    getEye(_eye);
    mat4LookAt(_viewMat, _eye, [1.0, 3.9, 0.3], _up);

    gl.uniform3fv(loc.uLight, _lightDir);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flagTex);
    gl.uniform1i(loc.uTex, 0);

    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    drawMesh(groundBufs, _projMat, _viewMat);
    drawMesh(poleBufs, _projMat, _viewMat);
    drawMesh(finialBufs, _projMat, _viewMat);

    gl.disable(gl.CULL_FACE);
    drawMesh(flagBufs, _projMat, _viewMat, 1);
    gl.enable(gl.CULL_FACE);
}

function drawMesh(bufs, projMat, mvMat, useTex) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.pos);
    gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.norm);
    gl.vertexAttribPointer(loc.aNorm, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.aNorm);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.uv);
    gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc.aUV);
    gl.uniformMatrix4fv(loc.uProj, false, projMat);
    gl.uniformMatrix4fv(loc.uMV, false, mvMat);
    mat3Normal(_normalMat, mvMat);
    gl.uniformMatrix3fv(loc.uNM, false, _normalMat);
    gl.uniform1f(loc.uUseTex, useTex || 0);
    gl.uniform3fv(loc.uColor, bufs.color);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs.idx);
    gl.drawElements(gl.TRIANGLES, bufs.count, gl.UNSIGNED_SHORT, 0);
}

function createMeshBufs(mesh) {
    const pb = gl.createBuffer(), nb = gl.createBuffer();
    const ub = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ub); gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    return { pos: pb, norm: nb, uv: ub, idx: ib, count: mesh.indices.length, color: mesh.color };
}

function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
}
