export function createFlagTexture() {
    const W = 1024, H = Math.round(W / 1.9);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const stripeH = H / 13;

    for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF';
        ctx.fillRect(0, i * stripeH, W, stripeH + 1);
    }

    const cantonH = 7 * stripeH;
    const cantonW = 0.76 * H;
    ctx.fillStyle = '#3C3B6E';
    ctx.fillRect(0, 0, cantonW, cantonH);

    ctx.fillStyle = '#FFFFFF';
    const F = cantonH / 10;
    const G = cantonW / 12;
    const starR = 0.0308 * H;

    for (let row = 0; row < 9; row++) {
        const cy = F * (row + 1);
        const is6 = row % 2 === 0;
        const count = is6 ? 6 : 5;
        for (let col = 0; col < count; col++) {
            const cx = is6 ? G * (2 * col + 1) : G * (2 * col + 2);
            drawStar(ctx, cx, cy, starR);
        }
    }

    return c;
}

function drawStar(ctx, cx, cy, r) {
    const inner = r * 0.382;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 === 0 ? r : inner;
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}
