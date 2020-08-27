import { HEIGHT, WIDTH } from "./index.js";
import { fastConvexHull } from "./convex-hull.js";
export const startP = ({ x0, y }) => ({ x: x0, y });
export const endP = ({ x1, y }) => ({ x: x1, y });
export const distance = (a, b) => Math.sqrt(distanceSq(a, b));
export const distanceSq = (a, b) => {
    const dX = a.x - b.x;
    const dY = a.y - b.y;
    return dX * dX + dY * dY;
};
export const distanceSq2 = (a, b) => {
    const dX = a[0] - b[0];
    const dY = a[1] - b[1];
    return dX * dX + dY * dY;
};
export const spanWidth = (span) => span.x1 - span.x0;
export function shapeArea(shape) {
    return shape.reduce((acc, span) => acc + spanWidth(span), 0);
}
export function rawShapeArea(shape) {
    return Object.values(shape).reduce((acc, span) => acc + shapeArea(span), 0);
}
export function largestShape(shapes) {
    return shapes.reduce((prevBestShape, shape) => {
        const best = shapeArea(prevBestShape);
        const area = shapeArea(shape);
        return area > best ? shape : prevBestShape;
    }, []);
}
export function rectDims(rect) {
    return { w: rect.x1 - rect.x0, h: rect.y1 - rect.y0 };
}
export function boundsForShape(shape) {
    const y0 = shape[0].y;
    const y1 = shape[shape.length - 1].y;
    const x0 = Math.min(...shape.map(({ x0 }) => x0));
    const x1 = Math.max(...shape.map(({ x1 }) => x1));
    return { x0, x1, y0, y1 };
}
export function boundsForRawShape(shape) {
    let minY = Number.MAX_SAFE_INTEGER;
    let maxY = 0;
    let minX = Number.MAX_SAFE_INTEGER;
    let maxX = 0;
    for (const row of Object.values(shape)) {
        for (const span of row) {
            minY = Math.min(span.y, minY);
            maxY = Math.max(span.y, maxY);
            minX = Math.min(span.x0, minX);
            maxX = Math.max(span.x1, maxX);
        }
    }
    return { x0: minX, y0: minY, y1: maxY, x1: maxX };
}
export function widestSpan(shape) {
    let maxWidthSpan = shape[0];
    for (const span of shape) {
        if (spanWidth(span) > spanWidth(maxWidthSpan)) {
            maxWidthSpan = span;
        }
    }
    return maxWidthSpan;
}
export function narrowestSpan(shape) {
    let minWidthSpan;
    minWidthSpan = shape.find(x => x.x0 !== 0 && x.x1 !== WIDTH - 1);
    if (!minWidthSpan) {
        minWidthSpan = shape[0];
    }
    // TODO(jon): Ideally the narrowest span doesn't hit the frame edges.
    for (const span of shape) {
        if (spanWidth(span) <= spanWidth(minWidthSpan)) {
            if (span.x0 !== 0 && span.x1 !== WIDTH - 1) {
                minWidthSpan = span;
            }
        }
    }
    return minWidthSpan;
}
export function narrowestSlanted(shape, start) {
    const nIndex = shape.indexOf(start);
    // From the narrowest, wiggle about on each side to try to find a shorter distance between spans.
    const startIndex = Math.max(0, nIndex - 13);
    const endIndex = Math.min(shape.length - 1, nIndex + 13);
    const distances = [];
    for (let i = startIndex; i < endIndex; i++) {
        for (let j = startIndex; j < endIndex; j++) {
            if (i !== j) {
                const d = distanceSq(startP(shape[i]), endP(shape[j]));
                distances.push({
                    d,
                    skew: Math.abs(shape[i].y - shape[j].y),
                    left: shape[i],
                    right: shape[j]
                });
            }
        }
    }
    // If there are a bunch that are similar, prefer the least slanted one.
    distances.sort((a, b) => {
        // NOTE(defer spans where x0 or x1 is on the edge of the frame.
        if (a.left.x0 === 0 || a.right.x1 === WIDTH - 1) {
            return 1;
        }
        else if (b.left.x0 === 0 || b.right.x1 === WIDTH - 1) {
            return -1;
        }
        if (a.d < b.d) {
            return -1;
        }
        else if (a.d > b.d) {
            return 1;
        }
        else {
            if (a.skew < b.skew) {
                return -1;
            }
            else if (a.skew > a.skew) {
                return 1;
            }
            else {
                return b.right.y + b.left.y - (a.right.y + a.left.y);
            }
        }
    });
    if (distances.length) {
        let { left, right, d: bestD, skew: bestSkew } = distances[0];
        let i = 1;
        while (Math.abs(Math.sqrt(distances[i].d) - Math.sqrt(bestD)) < 1) {
            if (distances[i].skew < bestSkew) {
                bestSkew = distances[i].skew;
                left = distances[i].left;
                right = distances[i].right;
            }
            i++;
            if (i === distances.length) {
                break;
            }
        }
        return [left, right];
    }
    return [start, start];
}
export function narrowestSpans(shape) {
    const narrowest = narrowestSpan(shape);
    return narrowestSlanted(shape, narrowest);
}
export function magnitude(vec) {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}
export function normalise(vec) {
    const len = magnitude(vec);
    return {
        x: vec.x / len,
        y: vec.y / len
    };
}
export function scale(vec, scale) {
    return {
        x: vec.x * scale,
        y: vec.y * scale
    };
}
export function perp(vec) {
    // noinspection JSSuspiciousNameCombination
    return {
        x: vec.y,
        y: -vec.x
    };
}
export function add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    };
}
export function sub(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    };
}
// Face specific stuff
export function faceIsFrontOn(face) {
    // Face should be full inside frame, or at least forehead should be.
    // Face should be front-on symmetry wise
    return face.headLock !== 0;
}
export function faceArea(face) {
    // TODO(jon): Could give actual pixel area of face too?
    const width = distance(face.horizontal.left, face.horizontal.right);
    const height = distance(face.vertical.top, face.vertical.bottom);
    return width * height;
}
export function faceHasMovedOrChangedInSize(face, prevFace) {
    if (!prevFace) {
        return true;
    }
    if (!faceIsFrontOn(prevFace)) {
        return true;
    }
    // Now check relative sizes of faces.
    const prevArea = faceArea(prevFace);
    const nextArea = faceArea(face);
    const diffArea = Math.abs(nextArea - prevArea);
    const changedArea = diffArea > 150;
    if (changedArea) {
        /// console.log('area changed too much');
        return true;
    }
    const dTL = distance(face.head.topLeft, prevFace.head.topLeft);
    const dTR = distance(face.head.topRight, prevFace.head.topRight);
    const dBL = distance(face.head.bottomLeft, prevFace.head.bottomLeft);
    const dBR = distance(face.head.bottomRight, prevFace.head.bottomRight);
    const maxMovement = Math.max(dTL, dTR, dBL, dBR);
    if (maxMovement > 10) {
        /// console.log('moved too much', maxMovement);
        return true;
    }
    return false;
}
export const isLeft = (l0, l1, p) => 
// Use cross-product to determine which side of a line a point is on.
(l1.x - l0.x) * (p.y - l0.y) - (l1.y - l0.y) * (p.x - l0.x);
export const pointIsLeftOfOrOnLine = (l0, l1, p) => 
// Use cross-product to determine which side of a line a point is on.
isLeft(l0, l1, p) >= 0;
export const pointIsLeftOfLine = (l0, l1, p) => 
// Use cross-product to determine which side of a line a point is on.
isLeft(l0, l1, p) > 0;
export function isNotCeilingHeat(shape) {
    return !(shape[0].y === 0 && shape.length < 80);
}
export function pointIsInQuad(p, quad) {
    return (pointIsLeftOfLine(quad.bottomLeft, quad.topLeft, p) &&
        pointIsLeftOfLine(quad.topRight, quad.bottomRight, p) &&
        pointIsLeftOfLine(quad.bottomRight, quad.bottomLeft, p) &&
        pointIsLeftOfLine(quad.topLeft, quad.topRight, p));
}
export function faceIntersectsThermalRef(face, thermalReference) {
    if (thermalReference === null) {
        return false;
    }
    const quad = { topLeft: face.head.topLeft, topRight: face.head.topRight, bottomLeft: face.head.bottomLeft, bottomRight: face.head.bottomRight };
    return (pointIsInQuad({ x: thermalReference.x0, y: thermalReference.y0 }, quad) ||
        pointIsInQuad({ x: thermalReference.x0, y: thermalReference.y1 }, quad) ||
        pointIsInQuad({ x: thermalReference.x1, y: thermalReference.y0 }, quad) ||
        pointIsInQuad({ x: thermalReference.x1, y: thermalReference.y1 }, quad));
}
export function shapesOverlap(a, b) {
    for (const [y, rowA] of Object.entries(a)) {
        if (b[Number(y)]) {
            for (const spanB of b[Number(y)]) {
                for (const spanA of rowA) {
                    if (!(spanA.x1 < spanB.x0 || spanA.x0 >= spanB.x1)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}
export function drawRawShapesIntoMask(shapes, data, bit, width = 120) {
    for (const shape of shapes) {
        for (const row of Object.values(shape)) {
            for (const span of row) {
                let i = span.x0;
                if (span.x0 >= span.x1) {
                    console.warn("Weird spans", span.x0, span.x1);
                    continue;
                }
                do {
                    data[span.y * width + i] |= bit;
                    i++;
                } while (i < span.x1);
            }
        }
    }
}
export function drawShapesIntoMask(shapes, data, bit, width = 120) {
    for (const shape of shapes) {
        for (const span of shape) {
            let i = span.x0;
            if (span.x0 >= span.x1) {
                console.warn("Weird spans", span.x0, span.x1);
                continue;
            }
            do {
                data[span.y * width + i] |= bit;
                i++;
            } while (i < span.x1);
        }
    }
}
export function getSolidShapes(frameShapes) {
    const solidShapes = [];
    // Infills vertical cracks.
    for (const shape of frameShapes) {
        const solidShape = [];
        for (const [row, spans] of Object.entries(shape)) {
            const minX0 = spans.reduce((acc, span) => Math.min(acc, span.x0), Number.MAX_SAFE_INTEGER);
            const maxX1 = spans.reduce((acc, span) => Math.max(acc, span.x1), 0);
            solidShape.push({
                x0: minX0,
                x1: maxX1,
                y: Number(row)
            });
        }
        solidShape.sort((a, b) => a.y - b.y);
        solidShapes.push(solidShape);
    }
    return solidShapes;
}
export function shapeIsNotCircular(shape) {
    const dims = rectDims(boundsForShape(shape));
    return Math.abs(dims.w - dims.h) > 4;
}
export function shapeIsOnSide(shape) {
    for (const { x0, x1 } of shape) {
        if (x0 === 0 || x1 === WIDTH - 1) {
            return true;
        }
    }
    return false;
}
export function extendToBottom(shape) {
    const halfway = Math.floor(shape.length / 2);
    let prevSpan = shape[halfway];
    for (let i = halfway + 1; i < shape.length; i++) {
        const span = shape[i];
        // Basically, if it's past halfway down the shape, and it's narrowing too much,
        // don't let it.
        const width = spanWidth(span);
        const prevWidth = spanWidth(prevSpan);
        if (Math.abs(prevWidth - width) > 1) {
            // Make sure x0 and x1 are always at least as far out as the previous span:
            span.x0 = Math.min(span.x0, prevSpan.x0);
            span.x1 = Math.max(span.x1, prevSpan.x1);
        }
        prevSpan = span;
    }
    const inc = 0;
    while (prevSpan.y < HEIGHT) {
        const dup = {
            y: prevSpan.y + 1,
            x0: prevSpan.x0 - inc,
            x1: prevSpan.x1 + inc,
            h: 0
        };
        // Add all the duplicate spans:
        shape.push(dup);
        prevSpan = dup;
    }
    return shape;
}
export function spanOverlapsShape(span, shape) {
    if (shape[span.y - 1]) {
        for (const upperSpan of shape[span.y - 1]) {
            if (!(upperSpan.x1 < span.x0 || upperSpan.x0 >= span.x1)) {
                return true;
            }
        }
    }
    if (shape[span.y + 1]) {
        for (const lowerSpan of shape[span.y + 1]) {
            if (!(lowerSpan.x1 < span.x0 || lowerSpan.x0 >= span.x1)) {
                return true;
            }
        }
    }
    return false;
}
export function mergeShapes(shape, other) {
    const rows = [...Object.keys(shape), ...Object.keys(other)];
    for (const row of rows) {
        const rowN = Number(row);
        if (shape[rowN] && other[rowN]) {
            shape[rowN].push(...other[rowN]);
        }
        else if (other[rowN]) {
            shape[rowN] = other[rowN];
        }
    }
}
export function getRawShapes(thresholded, width, height, maskBit = 255) {
    const shapes = [];
    for (let y = 0; y < height; y++) {
        let span = { x0: -1, x1: width, y, h: 0 };
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (thresholded[index] & maskBit && span.x0 === -1) {
                span.x0 = x;
            }
            if (span.x0 !== -1 && (!(thresholded[index] & maskBit) || x === width - 1)) {
                if (x === width - 1 && thresholded[index] & maskBit) {
                    span.x1 = width;
                }
                else {
                    span.x1 = x;
                }
                // Either put the span in an existing open shape, or start a new shape with it
                let assignedSpan = false;
                let n = shapes.length;
                let assignedShape;
                while (n !== 0) {
                    const shape = shapes.shift();
                    const overlap = shape && spanOverlapsShape(span, shape);
                    if (overlap) {
                        // Merge shapes
                        if (!assignedSpan) {
                            assignedSpan = true;
                            if (shape[y]) {
                                shape[y].push(span);
                            }
                            else {
                                shape[y] = [span];
                            }
                            assignedShape = shape;
                            shapes.push(shape);
                        }
                        else {
                            // Merge this shape with the shape the span was assigned to.
                            mergeShapes(assignedShape, shape);
                        }
                    }
                    else {
                        shapes.push(shape);
                    }
                    n--;
                }
                if (!assignedSpan) {
                    shapes.push({ [y]: [span] });
                }
                span = { x0: -1, x1: width, y, h: 0 };
            }
        }
    }
    return shapes;
}
export function offsetRawShape(shapes, offset) {
    const newShapes = [];
    for (const shape of shapes) {
        const newShape = {};
        for (const row of Object.values(shape)) {
            for (const span of row) {
                if (!newShape[span.y + offset.y]) {
                    newShape[span.y + offset.y] = [];
                }
                newShape[span.y + offset.y].push({
                    x0: span.x0 + offset.x,
                    x1: span.x1 + offset.x,
                    y: span.y + offset.y
                });
            }
        }
        newShapes.push(newShape);
    }
    return newShapes;
}
export function joinShapes(top, bottom, quad) {
    const s = {};
    for (const span of top) {
        if (s[span.y]) {
            s[span.y].push(span);
        }
        else {
            s[span.y] = [span];
        }
    }
    // TODO(jon): Need to rasterize the quad and add it.
    // First get the quad bounds, then test every point inside the bounds.
    const quadBounds = boundsForConvexHull([quad.bottomLeft, quad.bottomRight, quad.topLeft, quad.topRight]);
    const width = quadBounds.x1 - quadBounds.x0;
    const height = quadBounds.y1 - quadBounds.y0;
    const bitmap = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = { x: quadBounds.x0 + x, y: quadBounds.y0 + y };
            if (pointIsInQuad(p, quad)) {
                const index = y * width + x;
                bitmap[index] = 255;
            }
        }
    }
    const rr = getRawShapes(bitmap, width, height);
    const raw = offsetRawShape(rr, { x: quadBounds.x0, y: quadBounds.y0 });
    const r = getSolidShapes(raw);
    if (r.length) {
        for (const span of r[0]) {
            if (s[span.y]) {
                s[span.y].push(span);
            }
            else {
                s[span.y] = [span];
            }
        }
    }
    for (const span of bottom) {
        if (s[span.y]) {
            s[span.y].push(span);
        }
        else {
            s[span.y] = [span];
        }
    }
    // TODO(jon): Join shapes needs to fill in the gaps with something
    //const shapes =
    return getSolidShapes([s])[0];
}
export function boundsForConvexHull(hull) {
    const x0 = hull.reduce((minX, point) => (point.x < minX ? point.x : minX), hull[0].x);
    const x1 = hull.reduce((maxX, point) => (point.x > maxX ? point.x : maxX), hull[0].x);
    const y0 = hull.reduce((minY, point) => (point.y < minY ? point.y : minY), hull[0].y);
    const y1 = hull.reduce((maxY, point) => (point.y > maxY ? point.y : maxY), hull[0].y);
    return { x0, x1, y0, y1 };
}
export function convexHullForShape(shape) {
    const points = [];
    for (const span of shape) {
        points.push([span.x0, span.y]);
        points.push([span.x1, span.y]);
    }
    return fastConvexHull(points).map(([x, y]) => ({ x, y }));
}
export function convexHullForPoints(points) {
    return fastConvexHull(points).map(([x, y]) => ({ x, y }));
    // TODO(jon): Need to "rasterize" the convex hull back to our span based form.
    //  Get the bounds of the convex hull, then iterate through each pixel and check whether or not they are outside
    //  the shape (maybe divide into triangles, and use pointInsideTriangle?)
}
export function closestPoint(point, points) {
    let bestP;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const p of points) {
        const d = distanceSq(p, point);
        if (d < bestD) {
            bestD = d;
            bestP = p;
        }
    }
    return bestP;
}
export function allNeighboursEqual(x, y, data, bit) {
    const w = 120;
    const top = data[(y - 1) * w + x];
    const topLeft = data[(y - 1) * w + (x - 1)];
    const topRight = data[(y - 1) * w + (x + 1)];
    const left = data[(y) * w + (x - 1)];
    const right = data[(y) * w + (x + 1)];
    const bottom = data[(y + 1) * w + x];
    const bottomLeft = data[(y + 1) * w + (x - 1)];
    const bottomRight = data[(y + 1) * w + (x + 1)];
    return (top === bit &&
        topRight === bit &&
        right === bit &&
        bottomRight === bit &&
        bottom === bit &&
        bottomLeft === bit &&
        left === bit &&
        topLeft === bit);
}
export function localDensity(x, y, data, bit) {
    const x0 = Math.max(x - 2, 0);
    const x1 = Math.min(x + 2, 119);
    const y0 = Math.max(y - 2, 0);
    const y1 = Math.min(y + 2, 159);
    let sum = 0;
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const index = y * 120 + x;
            if (data[index] & bit) {
                sum++;
            }
        }
    }
    return sum;
}
export function distToSegmentSquared(p, v, w) {
    const l2 = distanceSq(v, w);
    if (l2 == 0) {
        return distanceSq(p, v);
    }
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return distanceSq(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
export function directionOfSet(set) {
    // What's a good way to get the current average direction?
    // This is "least squares"
    const meanX = set.reduce((acc, { x }) => acc + x, 0) / set.length;
    const meanY = set.reduce((acc, { y }) => acc + y, 0) / set.length;
    let num = 0;
    let den = 0;
    for (const p of set) {
        num += (p.x - meanX) * (p.y - meanY);
        den += (p.x - meanX) ** 2;
    }
    const gradient = num / den;
    const yIntercept = meanY - gradient * meanX;
    //return {x: gradient, y: yIntercept};
    return { v: normalise({ x: 1, y: gradient }), y: yIntercept };
}
export const pointsAreEqual = (a, b) => a.x === b.x && a.y === b.y;
export const pointIsInSet = (pt, set) => set.find(x => pointsAreEqual(x, pt)) !== undefined;
const maxSliceLength = 5;
export const minYIndex = (arr) => {
    let lowestY = Number.MAX_SAFE_INTEGER;
    let lowestIndex = 0;
    for (let i = 0; i < arr.length; i++) {
        const y = arr[i].y;
        if (y < lowestY) {
            lowestY = y;
            lowestIndex = i;
        }
    }
    return lowestIndex;
};
export const head = (arr) => arr.slice(0, Math.min(maxSliceLength, arr.length - 1));
export const tail = (arr) => arr.slice((arr.length - 1) - Math.min(maxSliceLength, arr.length) + 1, Math.min(maxSliceLength, arr.length) + 1);
export function fillVerticalCracks(shape) {
    // Fill gaps?
    for (let i = 0; i < shape.length; i++) {
        const startSpan = shape[i];
        let startWidth = spanWidth(startSpan);
        let shouldFill = false;
        let startFillIndex = i;
        if (i + 1 >= shape.length) {
            break;
        }
        while (i + 1 < shape.length && startWidth / spanWidth(shape[i + 1]) > 2) {
            shouldFill = true;
            i++;
        }
        if (shouldFill) {
            const endSpan = shape[i];
            for (let j = startFillIndex + 1; j < i + 1; j++) {
                shape[j].x0 = Math.min(startSpan.x0, endSpan.x0);
                shape[j].x1 = Math.max(startSpan.x1, endSpan.x1);
            }
        }
    }
}
export function cloneShape(shape) {
    const newShape = [];
    for (const span of shape) {
        newShape.push({ ...span });
    }
    return newShape;
}
