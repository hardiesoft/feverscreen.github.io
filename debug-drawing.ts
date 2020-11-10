import {ThermalReference} from "./extract-frame-info";

export function drawBackgroundImage(canvas: HTMLCanvasElement, data: Float32Array, min: number, max: number, thermalReference: ThermalReference) {
    const thermalReferenceOnLeft = thermalReference.geom.center.x < 60;
    const thermalReferenceLeft = thermalReferenceOnLeft ? 42 : 0;
    const thermalReferenceRight = thermalReferenceOnLeft ? 120 : 120 - 42;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const img = ctx.getImageData(0, 0, 120, 160);
    const imageData = new Uint32Array(img.data.buffer);
    const range = (max - min);
    for (let i = 0; i < data.length; i++) {
        const x = i % 120;
        if (x >= thermalReferenceLeft && x <= thermalReferenceRight) {
            const v = Math.max(0, Math.min(255, ((data[i] - min) / range) * 255.0));
            imageData[i] = 0xff << 24 | v << 16 | v << 8 | v;
        } else {
            imageData[i] = 0xff000000;
        }
    }
    ctx.putImageData(img, 0, 0);
}

export function drawHistogram(canvas: HTMLCanvasElement, histogram: number[], min: number, max: number, threshold: number) {

    const numBuckets = histogram.length;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const range = max - min;
    const thresholdLocation = range / (threshold - min);
    const maxVal = Math.max(...histogram);
    for (let x = 0; x < histogram.length; x++) {
        ctx.fillStyle = "red";
        const bucket = histogram[x];
        const v = (bucket / maxVal) * canvas.height;
        const xx = (canvas.width / numBuckets) * x;
        ctx.fillRect(xx, canvas.height - v, canvas.width / numBuckets, v);
    }
    ctx.fillStyle = 'white';
    ctx.fillRect(Math.floor(canvas.width * (1 / thresholdLocation)), 0, 1, canvas.height);
}
