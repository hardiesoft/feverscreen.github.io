import * as curveFit from "./curve-fit/curve_fitting.js";
import { allNeighboursEqual, distanceSq2, extendToBottom, largestShape, localDensity } from "./geom.js";
import { edgeBit, getHottestSpotInBounds, motionBit, thresholdBit } from "./body-detection.js";
import DBScan from "./dbscan-ts.js";
import { fastConvexHull } from "./convex-hull.js";
export function drawBackgroundImage(canvas, data, min, max) {
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, 120, 160);
    const imageData = new Uint32Array(img.data.buffer);
    const range = (max - min);
    for (let i = 0; i < data.length; i++) {
        const v = Math.max(0, Math.min(255, ((data[i] - min) / range) * 255.0));
        imageData[i] = 0xff << 24 | v << 16 | v << 8 | v;
    }
    ctx.putImageData(img, 0, 0);
}
export function drawCurveFromPoints(pointsArray, canvas) {
    let ctx;
    if (canvas instanceof CanvasRenderingContext2D) {
        ctx = canvas;
    }
    else {
        ctx = canvas.getContext('2d');
    }
    const bezierPts = curveFit.fitCurveThroughPoints(pointsArray, 0.75);
    // TODO(jon): Run a smoothing pass on this to smooth out longer lines?
    // Maybe have adaptive error for different parts of the curve?
    if (bezierPts.length) {
        {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            //ctx.setLineDash([3, 6]);
            //ctx.fillStyle = "rgba(255, 255, 255, 1)";
            // ctx.strokeStyle = "rgba(255, 0, 255, 1)";
            ctx.beginPath();
            ctx.moveTo(bezierPts[0], bezierPts[1]);
            for (let i = 2; i < bezierPts.length; i += 6) {
                ctx.bezierCurveTo(bezierPts[i], bezierPts[i + 1], bezierPts[i + 2], bezierPts[i + 3], bezierPts[i + 4], bezierPts[i + 5]);
            }
            ctx.stroke();
        }
        ctx.save();
    }
}
export function drawCurve(shapes, canvas) {
    if (shapes.length) {
        const shape = extendToBottom(largestShape(shapes));
        const pointsArray = new Uint8Array(shape.length * 4);
        let i = 0;
        for (const span of shape) {
            pointsArray[i++] = span.x1;
            pointsArray[i++] = span.y;
        }
        for (const span of shape.reverse()) {
            pointsArray[i++] = span.x0;
            pointsArray[i++] = span.y;
        }
        drawCurveFromPoints(pointsArray, canvas);
    }
}
export function drawHistogram(canvas, histogram, min, max, threshold) {
    const numBuckets = histogram.length;
    const ctx = canvas.getContext('2d');
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
export function drawPoint(p, canvas, color = 'green', radius = 2) {
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
}
export function drawConvexShape(convexHull, frameNum, canvas) {
    const ctx = canvas.getContext('2d');
    let o = 1;
    const inc = 1 / (convexHull.length * 2);
    ctx.beginPath();
    ctx.moveTo(convexHull[0].x, convexHull[0].y);
    for (let i = 0; i < convexHull.length; i++) { //convexHull.length
        const point = convexHull[i];
        ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
        o -= inc;
        ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(convexHull[0].x, convexHull[0].y);
    ctx.stroke();
    //ctx.lineTo(convexHull[0].x, convexHull[0].y);
}
export function drawShapes(shapes, frameNum, canvas, color = 0x33ff00ff) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const img = ctx.getImageData(0, 0, width, height);
    const data = new Uint32Array(img.data.buffer);
    for (let i = 0; i < data.length; i++) {
        data[i] = 0x00000000;
    }
    //const shape = largestShape(shapes);
    for (const shape of shapes) {
        for (const span of shape) {
            let i = span.x0;
            if (span.x0 >= span.x1) {
                console.warn("Weird spans", span.x0, span.x1);
                continue;
            }
            do {
                data[span.y * width + i] = color;
                i++;
            } while (i < span.x1);
        }
    }
    ctx.putImageData(img, 0, 0);
}
export function drawFace(face, canvas, threshold, smoothedImageData) {
    const context = canvas.getContext('2d');
    if (face) {
        //context.lineWidth = 1;
        if (face.headLock === 1.0) {
            context.strokeStyle = "red";
            //context.lineWidth = 0.5;
        }
        else if (face.headLock === 0.5) {
            context.strokeStyle = "orange";
        }
        else {
            context.strokeStyle = "blue";
        }
        context.beginPath();
        context.moveTo(face.head.bottomLeft.x, face.head.bottomLeft.y);
        context.lineTo(face.head.topLeft.x, face.head.topLeft.y);
        context.lineTo(face.head.topRight.x, face.head.topRight.y);
        context.lineTo(face.head.bottomRight.x, face.head.bottomRight.y);
        context.lineTo(face.head.bottomLeft.x, face.head.bottomLeft.y);
        context.moveTo(face.vertical.bottom.x, face.vertical.bottom.y);
        context.lineTo(face.vertical.top.x, face.vertical.top.y);
        context.moveTo(face.horizontal.left.x, face.horizontal.left.y);
        context.lineTo(face.horizontal.right.x, face.horizontal.right.y);
        context.stroke();
        if (face.headLock === 1.0) {
            // Now find the hotspot - only if we have a good lock!
            const point = getHottestSpotInBounds(face, threshold, 120, 160, smoothedImageData);
            context.lineWidth = 1;
            context.beginPath();
            context.strokeStyle = "rgba(255, 255, 0, 1)";
            context.arc(point.x - 0.5, point.y - 0.5, 3, 0, Math.PI * 2);
            context.stroke();
        }
        // context.moveTo(face.forehead.bottomLeft.x, face.forehead.bottomLeft.y);
        // context.lineTo(
        //   face.forehead.bottomRight.x,
        //   face.forehead.bottomRight.y
        // );
        // context.moveTo(face.forehead.topLeft.x, face.forehead.topLeft.y);
        // context.lineTo(face.forehead.topRight.x, face.forehead.topRight.y);
    }
}
export function drawRawShapes(shapes, frameNum, canvas, color = 0x33ff00ff) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const img = ctx.getImageData(0, 0, width, height);
    const data = new Uint32Array(img.data.buffer);
    for (let i = 0; i < data.length; i++) {
        data[i] = 0x00000000;
    }
    //const shape = largestShape(shapes);
    for (const shape of shapes) {
        for (const row of Object.values(shape)) {
            for (const span of row) {
                let i = span.x0;
                if (span.x0 >= span.x1) {
                    console.warn("Weird spans", span.x0, span.x1);
                    continue;
                }
                do {
                    data[span.y * width + i] = color;
                    i++;
                } while (i < span.x1);
            }
        }
    }
    ctx.putImageData(img, 0, 0);
}
function drawImage(canvas, canvas2, data, frameNumber) {
    const ctx = canvas.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    const imageData = new ImageData(new Uint8ClampedArray(160 * 120 * 4), 120, 160);
    const image = new Uint32Array(imageData.data.buffer);
    const newMask = new Uint8Array(120 * 160);
    let pp = [];
    const yellow = 0xff00ffff;
    const cyan = 0xffffff00;
    const red = 0xff0000ff;
    const blue = 0xffff0000;
    const green = 0xff00ff00;
    const ppp = [];
    const colors = [
        cyan,
        red,
        yellow,
        blue,
        green,
    ];
    for (let y = 0; y < 160; y++) {
        let prev = 0;
        for (let x = 0; x < 120; x++) {
            const i = y * 120 + x;
            const v = data[i];
            // TODO(jon): Optimise
            if (x > 0 && prev === 0 && (v & thresholdBit)) {
                //
            }
            else if (prev & thresholdBit && v === 0) {
                //
            }
            else if (v & edgeBit && v & thresholdBit && !allNeighboursEqual(x, y, data, edgeBit)) {
                newMask[i] = 1;
            }
            else if (v & edgeBit && v & motionBit && !allNeighboursEqual(x, y, data, motionBit)) {
                newMask[i] = 2;
            }
            prev = v;
        }
    }
    for (let y = 0; y < 160; y++) {
        for (let x = 0; x < 120; x++) {
            const i = y * 120 + x;
            if (newMask[i] === 1 && localDensity(x, y, newMask, 1) >= 3) {
                pp.push([x, y]);
            }
            else if (newMask[i] === 2 && localDensity(x, y, newMask, 2) >= 3) {
                pp.push([x, y]);
            }
        }
    }
    if (pp.length > 10) {
        const clusters = DBScan({
            dataset: pp,
            epsilon: 5 * 5,
            distanceFunction: distanceSq2,
            minimumPoints: 3
        });
        console.log(clusters);
        if (clusters.clusters.length) {
            let i = 0;
            for (const cluster of clusters.clusters) {
                if (cluster.length < 15) {
                    let anyPointIsOnThresholdPlusMotion = false;
                    for (const pointIndex of cluster) {
                        const point = pp[pointIndex];
                        const index = 120 * point[1] + point[0];
                        const v = data[index];
                        if ((v & motionBit) && (v & thresholdBit)) {
                            anyPointIsOnThresholdPlusMotion = true;
                            break;
                        }
                    }
                    for (const pointIndex of cluster) {
                        const point = pp[pointIndex];
                        const index = 120 * point[1] + point[0];
                        if (anyPointIsOnThresholdPlusMotion) {
                            image[index] = colors[i % colors.length];
                            ppp.push(point);
                        }
                    }
                }
                else {
                    for (const pointIndex of cluster) {
                        const point = pp[pointIndex];
                        const index = 120 * point[1] + point[0];
                        ppp.push(point);
                        image[index] = colors[i % colors.length];
                    }
                }
                i++;
            }
        }
        if (ppp.length > 15) {
            let hull = fastConvexHull(ppp);
            // Take the leftmost and right most points, and extend to the bottom:
            let minX = Number.MAX_SAFE_INTEGER;
            let maxX = 0;
            let leftIndex = 0;
            let rightIndex = 0;
            for (let i = 0; i < hull.length; i++) {
                const p = hull[i];
                if (p[0] < minX) {
                    minX = p[0];
                    leftIndex = i;
                }
                if (p[0] > maxX) {
                    maxX = p[0];
                    rightIndex = i;
                }
            }
            hull.splice(1, rightIndex - 1);
            hull.splice(1, 0, [hull[0][0], 159], [hull[1][0], 159]);
            let first = hull.findIndex(([x, y]) => y === 159);
            hull = [...hull.slice(first + 1), ...hull.slice(0, first + 1)].reverse();
            ctx2.beginPath();
            ctx2.strokeStyle = 'blue';
            ctx2.fillStyle = 'rgba(0, 255, 0, 0.1)';
            ctx2.moveTo(hull[0][0], hull[0][1]);
            for (const [x, y] of hull.slice(1)) {
                ctx2.lineTo(x, y);
            }
            ctx2.lineTo(hull[0][0], hull[0][1]);
            ctx2.fill();
            ctx2.stroke();
            // Draw the convex hull, then take a mask from it:
        }
    }
    const imData = ctx2.getImageData(0, 0, 120, 160);
    const d = new Uint32Array(imData.data.buffer);
    for (let i = 0; i < d.length; i++) {
        if (!(d[i] & 0x0000ff00)) { // TODO(jon): Make sure the pixel is not inside the thermal ref box
            data[i] &= ~thresholdBit;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return ppp;
}
