import * as cptvPlayer from './cptv-player/cptv_player.js';
import * as smooth from "./smooth/smooth.js";
import * as curveFit from "./curve-fit/curve_fitting.js";
import {concaveman, fastConvexHull} from "./concaveman.js";
import DBScan from "./dbscan.js";
import {detectThermalReference, edgeDetect, extractSensorValueForCircle, ROIFeature} from "./feature-detection.js";
import {ScreeningAcceptanceStates, ScreeningState} from './screening.js';
import has = Reflect.has;

const motionBit = 1 << 7;
const thresholdBit = 1 << 6;
const edgeBit = 1 << 5;

export interface FaceInfo {
    halfwayRatio: number;
    headLock: number;
    forehead: {
        bottom: Point;
        bottomLeft: Point;
        bottomRight: Point;
        top: Point;
        topLeft: Point;
        topRight: Point;
    };
    vertical: {
        bottom: Point;
        top: Point;
    };
    horizontal: {
        left: Point;
        right: Point;
        middle: Point;
    };
    head: {
        topLeft: Point;
        topRight: Point;
        bottomLeft: Point;
        bottomRight: Point;
        leftNeckSpan: Span;
        rightNeckSpan: Span;
    };
}


interface Span {
    x0: number;
    x1: number;
    y: number;
    h: number; // bit marker
}
export interface Rect {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface Vec2 {
    x: number;
    y: number;
}

function raymarchFaceDims(l1: Point, neckBaseMiddleP: Point, body: Shape): {
    normMidline: Vec2,
    leftSymmetry: number[],
    rightSymmetry: number[],
    scaleFactor: number,
    perpLeft: Vec2,
    perpRight: Vec2,
    maxLeftScale: number,
    maxRightScale: number,
    heightProbeP: Point,
} {
    let normMidline = normalise(sub(l1, neckBaseMiddleP));
    // TODO(jon): Discard boxes that are too long/wide ratio-wise.

    const perpLeft = normalise(perp(normMidline));
    const perpRight = normalise(perp(perp(perp(normMidline))));

    // TODO(jon): From the middle of the lower part of the face, march across and try to find the coldest point close
    //  to the center, this is probably the nose, and we can use it to help find the center line of the face.

    const startY = body[0].y;
    // Keep going until there are no spans to the left or right, so ray-march left and then right.
    let scaleFactor = 0;
    let heightProbeP = neckBaseMiddleP;
    let maxLeftScale = 0;
    let maxRightScale = 0;
    const maxHeightScale = magnitude({ x: WIDTH, y: HEIGHT });
    const leftSymmetry = [];
    const rightSymmetry = [];

    while (scaleFactor < maxHeightScale) {
        const scaled = scale(normMidline, scaleFactor);
        heightProbeP = add(neckBaseMiddleP, scaled);
        let foundLeft = false;
        let foundRight = false;

        for (let incLeft = 1; incLeft < 50; incLeft++) {
            const probeP = add(heightProbeP, scale(perpLeft, incLeft));
            const xInBounds = probeP.x >= 0 && probeP.x < WIDTH;
            const probeY = Math.round(probeP.y);
            const shapeIndex = probeY - startY;
            if (shapeIndex < 0 || shapeIndex > body.length - 1) {
                break;
            }

            if (xInBounds && body[shapeIndex]) {
                if (
                    body[shapeIndex].x0 < probeP.x &&
                    body[shapeIndex].x1 > probeP.x
                ) {
                    //
                    foundLeft = true;
                    maxLeftScale = Math.max(incLeft, maxLeftScale);
                }
                if (body[shapeIndex].x0 > probeP.x) {
                    break;
                }
            }
        }
        for (let incRight = 1; incRight < 50; incRight++) {
            const probeP = add(heightProbeP, scale(perpRight, incRight));
            const xInBounds = probeP.x >= 0 && probeP.x < WIDTH;
            const probeY = Math.round(probeP.y);
            const shapeIndex = probeY - startY;

            if (shapeIndex < 0 || shapeIndex > body.length - 1) {
                break;
            }
            if (xInBounds && body[shapeIndex]) {
                if (
                    body[shapeIndex].x1 > probeP.x &&
                    body[shapeIndex].x0 < probeP.x
                ) {
                    foundRight = true;
                    maxRightScale = Math.max(incRight, maxRightScale);
                }
                if (body[shapeIndex].x1 < probeP.x) {
                    break;
                }
            }
        }
        leftSymmetry.push(maxLeftScale);
        rightSymmetry.push(maxRightScale);
        // symmetry.push([maxLeftScale, maxRightScale]);
        if (!(foundLeft || foundRight)) {
            break;
        }
        scaleFactor += 1;
    }
    return {
        normMidline,
        leftSymmetry,
        rightSymmetry,
        scaleFactor,
        perpLeft,
        perpRight,
        maxLeftScale,
        maxRightScale,
        heightProbeP
    }
}

export function extractFaceInfo(body: Shape, radialSmoothed: Float32Array, canvas: HTMLCanvasElement, maybeHasGlasses: boolean): FaceInfo | null {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const widest = widestSpan(body.slice(Math.round((body.length / 3) * 2)));
    const widestIndex = body.indexOf(widest);
    const widestWidth = spanWidth(widest);
    let halfWidth;
    // Work from bottom and find first span that is past widest point, and is around 1/2 of the width.

    // TODO(jon): Maybe we want to work our way further up and look for better candidates?
    for (let i = widestIndex; i > 10; i--) {
        const span = body[i];
        if (widestWidth / 2 > spanWidth(span)) {
            halfWidth = span;
            break;
        }
    }
    let left, right;
    if (halfWidth) {
        [left, right] = narrowestSlanted(body.slice(10), halfWidth);
    } else {
        [left, right] = narrowestSpans(body.slice(10));
    }

    // drawPoint({x: left.x0, y: left.y}, canvas, halfWidth ? 'orange' : 'pink', 3);
    // drawPoint({x: right.x1, y: right.y}, canvas, 'blue', 3);

    const startY = body[0].y;
    const start = { x: left.x0, y: left.y };
    const end = { x: right.x1, y: right.y };
    const vec = { x: right.x1 - left.x0, y: right.y - left.y };
    const halfway = scale(vec, 0.5);
    const perpV = scale(perp(vec), 3);
    let neckBaseMiddleP = add(start, halfway);
    let l1 = add(neckBaseMiddleP, perpV);
    let halfwayRatio = 1;
    // NOTE(jon): March down this line with a perp vector, and stop when we don't hit any pixels on either side.
    //  Then go halfway-down the line created by this joining line, and march out to either side to get the width
    //  of the middle of the face.  Now we should be able to get the forehead box, which we'll only use if
    //  we think the face is front-on.
    let perpLeft,
        perpRight,
        normMidline,
        scaleFactor,
        maxLeftScale,
        maxRightScale,
        leftSymmetry,
        rightSymmetry,
        heightProbeP
    {
        let dims = raymarchFaceDims(l1, neckBaseMiddleP, body);
        perpLeft = dims.perpLeft;
        perpRight = dims.perpRight;
        normMidline = dims.normMidline;
        scaleFactor = dims.scaleFactor;
        maxLeftScale = dims.maxLeftScale;
        maxRightScale = dims.maxRightScale;
        leftSymmetry = dims.leftSymmetry;
        rightSymmetry = dims.rightSymmetry;
        heightProbeP = dims.heightProbeP;


        if (!maybeHasGlasses) {
            // Let's try and adjust the midline based on colder noses.
            const noseP = add(neckBaseMiddleP, scale(normMidline, scaleFactor * 0.4));
            const noseLeftP = add(noseP, scale(perpLeft, maxLeftScale));
            const noseRightP = add(noseP, scale(perpRight, maxRightScale));
            let foundLeft = false;
            let coldest = Number.MAX_SAFE_INTEGER;
            let coldestP = {x: 0, y: 0};
            let coldestI = 0;
            const faceWidth = Math.ceil(distance(noseLeftP, noseRightP));
            for (let i = Math.floor(faceWidth * 0.1); i < Math.ceil(faceWidth * 0.9); i++) {
                const probeP = add(noseLeftP, scale(perpRight, i));
                const xInBounds = probeP.x >= 0 && probeP.x < WIDTH;
                const probeY = Math.round(probeP.y);
                const shapeIndex = probeY - startY;
                if (shapeIndex < 0 || shapeIndex > body.length - 1) {
                    break;
                }
                if (xInBounds && body[shapeIndex]) {
                    if (
                        body[shapeIndex].x1 > probeP.x &&
                        body[shapeIndex].x0 < probeP.x
                    ) {
                        foundLeft = true;
                        // Sample the pixel.
                        const index = 120 * probeY + Math.round(probeP.x);
                        const val = radialSmoothed[index];
                        if (val < coldest) {
                            coldest = val;
                            coldestP = probeP;
                            coldestI = i;
                        }

                    }
                    if (body[shapeIndex].x1 < probeP.x) {
                        break;
                    }
                }
            }
            //drawPoint(coldestP, canvas, "pink", 2);
            let coldestHalfway = scale(vec, coldestI / faceWidth);
            neckBaseMiddleP = add(start, coldestHalfway);
            halfwayRatio = coldestI / faceWidth;
        }
    }
    if (!maybeHasGlasses) {
        l1 = add(neckBaseMiddleP, perpV);
        const dims = raymarchFaceDims(l1, neckBaseMiddleP, body);
        perpLeft = dims.perpLeft;
        perpRight = dims.perpRight;
        normMidline = dims.normMidline;
        scaleFactor = dims.scaleFactor;
        maxLeftScale = dims.maxLeftScale;
        maxRightScale = dims.maxRightScale;
        leftSymmetry = dims.leftSymmetry;
        rightSymmetry = dims.rightSymmetry;
        heightProbeP = dims.heightProbeP;
    }
    // Adjust left and right symmetry, based on how much we're offset from the original neck base center point.
    //drawPoint(neckBaseMiddleP, canvas, "pink", 4);

    const ssym = [];
    // Divide left and right symmetry by maxLeftScale, maxRightScale;
    for (let i = 0; i < scaleFactor; i++) {
        ssym.push(
            Math.abs(
                leftSymmetry[i] / maxLeftScale - rightSymmetry[i] / maxRightScale
            )
        );
    }

    // TODO(jon): Detect "fringe" cases where there's not enough forehead.
    if (heightProbeP) {
        const bottomLeftP = add(neckBaseMiddleP, scale(perpLeft, maxLeftScale));
        const bottomRightP = add(neckBaseMiddleP, scale(perpRight, maxRightScale));
        const topLeftP = add(heightProbeP, scale(perpLeft, maxLeftScale));
        const topRightP = add(heightProbeP, scale(perpRight, maxRightScale));

        const headWidth = magnitude(sub(bottomLeftP, bottomRightP));
        const headHeight = magnitude(sub(topLeftP, bottomLeftP));
        const widthHeightRatio = headWidth / headHeight;
        const isValidHead = headHeight > headWidth && widthHeightRatio > 0.5;

        // TODO(jon): remove too small head areas.
        if (isValidHead) {
            // We only care about symmetry of the below forehead portion of the face, since above the eyes
            //  symmetry can be affected by hair parting to one side etc.
            const symmetryScore = ssym
                .slice(0, Math.floor(ssym.length / 2))
                .reduce((a, x) => a + x, 0);
            const areaLeft = leftSymmetry
                .slice(0, Math.floor(leftSymmetry.length / 2))
                .reduce((a, x) => a + x, 0);
            const areaRight = rightSymmetry
                .slice(0, Math.floor(rightSymmetry.length / 2))
                .reduce((a, x) => a + x, 0);
            // Use maxLeftScale and maxRightScale to get the face side edges.
            //console.log('area left, right', areaLeft, areaRight);
            //console.log('head width, height, ratio', headWidth, headHeight, headWidth / headHeight);
            // console.log("symmetry score", symmetryScore);
            //console.log(ssym.slice(0, Math.floor(symmetry.length / 2)));
            //console.log(symmetry.slice(0, Math.floor(symmetry.length / 2)));
            const areaDiff = Math.abs(areaLeft - areaRight);
            const isValidSymmetry = symmetryScore < 2; // && areaDiff < 50;

            let headLock = 0;

            if (Math.abs(bottomLeftP.y - bottomRightP.y) > 5) {
                headLock = 0;
            }

            // TODO(jon): I think we can relax this quite a bit and still get good results.
            else if (symmetryScore < 1.2 || (symmetryScore < 3 && areaDiff < 60) || (halfwayRatio > 0.4 && halfwayRatio < 0.6)) {
                headLock = 1.0;
            } else if (areaDiff >= 60) {
                headLock = 0.5;
            } else {
                headLock = 0.0;
            }
            // TODO(jon): Could also find center of mass in bottom part of the face, and compare with actual center.

            // Draw midline, draw forehead, colour forehead pixels.
            const midP = add(neckBaseMiddleP, scale(normMidline, scaleFactor * 0.5));
            const midLeftP = add(midP, scale(perpLeft, maxLeftScale));
            const midRightP = add(midP, scale(perpRight, maxRightScale));

            const foreheadTopP = add(
                neckBaseMiddleP,
                scale(normMidline, scaleFactor * 0.8)
            );
            const foreheadBottomP = add(
                neckBaseMiddleP,
                scale(normMidline, scaleFactor * 0.65)
            );
            const foreheadAmount = 0.4;
            const foreheadTopLeftP = add(
                foreheadTopP,
                scale(perpLeft, maxLeftScale * foreheadAmount)
            );
            const foreheadTopRightP = add(
                foreheadTopP,
                scale(perpRight, maxRightScale * foreheadAmount)
            );
            const foreheadBottomLeftP = add(
                foreheadBottomP,
                scale(perpLeft, maxLeftScale * foreheadAmount)
            );
            const foreheadBottomRightP = add(
                foreheadBottomP,
                scale(perpRight, maxRightScale * foreheadAmount)
            );

            // TODO(jon): Gather array of forehead pixels.

            return Object.freeze({
                halfwayRatio,
                headLock,
                forehead: {
                    top: foreheadTopP,
                    bottom: foreheadBottomP,
                    bottomLeft: foreheadBottomLeftP,
                    bottomRight: foreheadBottomRightP,
                    topLeft: foreheadTopLeftP,
                    topRight: foreheadTopRightP
                },
                vertical: {
                    bottom: neckBaseMiddleP,
                    top: heightProbeP
                },
                horizontal: {
                    left: midLeftP,
                    right: midRightP,
                    middle: midP
                },
                head: {
                    topLeft: topLeftP,
                    topRight: topRightP,
                    bottomLeft: bottomLeftP,
                    bottomRight: bottomRightP,
                    rightNeckSpan: {...right as Span}, // Was rightNeckSpan, leftNeckSpan
                    leftNeckSpan: {...left as Span}
                }
            });
        }
    }
    return null;
    // TODO(jon): Draw a line perpendicular to this line.
    // Then we can find the top of the head, and then the widest part of the head.
    // Then we can draw an oval.
    // The angle of the neck also helps us know if the head is front-on.

    // If the face is front-on, the width of the neck is roughly a third the width of shoulders, if visible.

    // TODO(jon): Separate case for animated outlines where we paint in irregularities in the head.
}

const WIDTH = 120;
const HEIGHT = 160;
export type Shape = Span[];
export type ImmutableShape = readonly Span[];

const isLeft = (l0: Point, l1: Point, p: Point): number =>
    // Use cross-product to determine which side of a line a point is on.
    (l1.x - l0.x) * (p.y - l0.y) - (l1.y - l0.y) * (p.x - l0.x);

const pointIsLeftOfOrOnLine = (l0: Point, l1: Point, p: Point): boolean =>
    // Use cross-product to determine which side of a line a point is on.
    isLeft(l0, l1, p) >= 0;

const pointIsLeftOfLine = (l0: Point, l1: Point, p: Point): boolean =>
    // Use cross-product to determine which side of a line a point is on.
    isLeft(l0, l1, p) > 0;

function isNotCeilingHeat(shape: Shape): boolean {
    return !(shape[0].y === 0 && shape.length < 80);
}

function magnitude(vec: Vec2): number {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

function normalise(vec: Vec2): Vec2 {
    const len = magnitude(vec);
    return {
        x: vec.x / len,
        y: vec.y / len
    };
}

function scale(vec: Vec2, scale: number): Vec2 {
    return {
        x: vec.x * scale,
        y: vec.y * scale
    };
}

function perp(vec: Vec2): Vec2 {
    // noinspection JSSuspiciousNameCombination
    return {
        x: vec.y,
        y: -vec.x
    };
}

function add(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    };
}

function sub(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    };
}

function getSolidShapes(frameShapes: Array<Record<number, Shape>>): Shape[] {
    const solidShapes = [];
    // Infills vertical cracks.
    for (const shape of frameShapes) {
        const solidShape: Shape = [];
        for (const [row, spans] of Object.entries(shape)) {
            const minX0 = spans.reduce(
                (acc, span) => Math.min(acc, span.x0),
                Number.MAX_SAFE_INTEGER
            );
            const maxX1 = spans.reduce((acc, span) => Math.max(acc, span.x1), 0);
            solidShape.push({
                x0: minX0,
                x1: maxX1,
                y: Number(row),
                h: 0
            });
        }
        solidShape.sort((a, b) => a.y - b.y);
        solidShapes.push(solidShape);
    }
    return solidShapes;
}

const spanWidth = (span: Span): number => span.x1 - span.x0;

function shapeArea(shape: Shape): number {
    return shape.reduce((acc, span) => acc + spanWidth(span), 0);
}

function rawShapeArea(shape: RawShape): number {
    return Object.values(shape).reduce((acc, span) => acc + shapeArea(span), 0);
}

function largestShape(shapes: Shape[]): Shape {
    return shapes.reduce((prevBestShape: Shape, shape: Shape) => {
        const best = shapeArea(prevBestShape);
        const area = shapeArea(shape);
        return area > best ? shape : prevBestShape;
    }, []);
}

function rectDims(rect: Rect): { w: number; h: number } {
    return { w: rect.x1 - rect.x0, h: rect.y1 - rect.y0 };
}

function boundsForShape(shape: Shape): Rect {
    const y0 = shape[0].y;
    const y1 = shape[shape.length - 1].y;
    const x0 = Math.min(...shape.map(({ x0 }) => x0));
    const x1 = Math.max(...shape.map(({ x1 }) => x1));
    return { x0, x1, y0, y1 };
}

function boundsForRawShape(shape: RawShape): Rect {
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

function shapeIsNotCircular(shape: Shape): boolean {
    const dims = rectDims(boundsForShape(shape));
    return Math.abs(dims.w - dims.h) > 4;
}

function shapeIsOnSide(shape: Shape): boolean {
    for (const { x0, x1 } of shape) {
        if (x0 === 0 || x1 === WIDTH - 1) {
            return true;
        }
    }
    return false;
}

function smoothKnobblyBits(shape: Shape): Shape {
    const halfway = Math.floor(shape.length / 2);
    let prev = shape[halfway];
    for (let i = halfway + 1; i < shape.length; i++) {
        const span = shape[i];
        const dx0 = Math.abs(span.x0 - prev.x0);
        const dx1 = Math.abs(span.x1 - prev.x1);
        if (dx0 > 2) {
            span.x0 = prev.x0;
        }
        if (dx1 > 2) {
            span.x1 = prev.x1;
        }
        prev = span;
    }
    return shape;
}

const startP = ({ x0, y }: Span): Point => ({ x: x0, y });
const endP = ({ x1, y }: Span): Point => ({ x: x1, y });
const distance = (a: Point, b: Point): number => Math.sqrt(distanceSq(a, b));

const distanceSq = (a: Point, b: Point): number => {
    const dX = a.x - b.x;
    const dY = a.y - b.y;
    return dX * dX + dY * dY;
};

function widestSpan(shape: Span[]): Span {
    let maxWidthSpan = shape[0];
    for (const span of shape) {
        if (spanWidth(span) > spanWidth(maxWidthSpan)) {
            maxWidthSpan = span;
        }
    }
    return maxWidthSpan;
}

function narrowestSpan(shape: Shape): Span {
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

function narrowestSlanted(shape: Shape, start: Span): [Span, Span] {
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
        } else if (b.left.x0 === 0 || b.right.x1 === WIDTH - 1) {
            return -1;
        }

        if (a.d < b.d) {
            return -1;
        } else if (a.d > b.d) {
            return 1;
        } else {
            if (a.skew < b.skew) {
                return -1;
            } else if (a.skew > a.skew) {
                return 1;
            } else {
                return b.right.y + b.left.y - (a.right.y + a.left.y);
            }
        }
    });
    let { left, right, d: bestD, skew: bestSkew } = distances[0];
    let i = 1;
    while (Math.abs(Math.sqrt(distances[i].d) - Math.sqrt(bestD)) < 1) {
        if (distances[i].skew < bestSkew) {
            bestSkew = distances[i].skew;
            left = distances[i].left;
            right = distances[i].right;
        }
        i++;
    }
    return [left, right];
}

function narrowestSpans(shape: Shape): [Span, Span] {
    const narrowest = narrowestSpan(shape.slice(10));
    return narrowestSlanted(shape, narrowest);
}

function markWidest(shape: Shape): Shape {
    // Take just the bottom 2/3rds
    widestSpan(shape.slice(Math.round((shape.length / 3) * 2))).h |= 1 << 2;
    return shape;
}

function markNarrowest(shape: Shape): Shape {
    narrowestSpan(shape.slice(10)).h |= 1 << 3;
    return shape;
}

function markShoulders(shapes: Shape[]): Shape[] {
    // TODO(jon): This might actually work best starting at the bottom and working our way up.
    //  But maybe we can try both and see if they are very mismatched?

    // Mark the narrowest point that's not part of the head tapering in at the top.
    for (const shape of shapes) {
        const prev = shape[shape.length - 1];
        let min = Number.MAX_SAFE_INTEGER;
        let minSpan;
        for (let i = shape.length - 2; i > -1; i--) {
            const curr = shape[i];
            min = Math.min(spanWidth(curr), min);
        }
        // Check if we flare out at the left and right.
        // Take a running average of spans.

        // Note that this might fail if we have people wearing coats etc.

        // Once we find a narrow point, search around it up to about 30 degrees each way for tilted narrowest points.

        if (shape.length > 10) {
            shape[10].h |= 1 << 1;
        }
    }
    return shapes;
}

function extendToBottom(shape: Shape): Shape {
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



export function getHottestSpotInBounds(
    face: FaceInfo,
    threshold: number,
    width: number,
    height: number,
    imageData: Float32Array
): { x: number; y: number; v: number } {
    const forehead = face.forehead;
    const x0 = Math.floor(Math.min(forehead.topLeft.x, forehead.bottomLeft.x));
    const x1 = Math.ceil(Math.max(forehead.topRight.x, forehead.bottomRight.x));
    const y0 = Math.floor(Math.min(forehead.topLeft.y, forehead.topRight.y));
    const y1 = Math.ceil(Math.max(forehead.bottomLeft.y, forehead.bottomRight.y));

    const idealCenter = add(
        forehead.top,
        scale(
            normalise(sub(forehead.bottom, forehead.top)),
            distance(forehead.bottom, forehead.top) * 0.8
        )
    );
    let bestDistance = Number.MAX_SAFE_INTEGER;
    let bestPoint = { x: 0, y: 0 };
    let bestVal = 0;

    // NOTE: Sometimes the point we want is covered by hair, and we don't want to sample that, so
    //  take the closest point to that ideal point from the area that we know actually has passed our
    //  threshold temperature test.
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const p = { x, y };
            if (pointIsInQuad(p, forehead)) {
                const index = (y * width + x);
                const temp = imageData[index];
                if (temp > threshold) {
                    const d = distanceSq(idealCenter, p);
                    if (d < bestDistance) {
                        bestDistance = d;
                        bestPoint = p;
                        bestVal = temp;
                    }
                }
            }
        }
    }
    return { x: bestPoint.x, y: bestPoint.y, v: bestVal };
}

type RawFrames = Record<number, Array<Record<number, Shape>>>;

// async function loadJSON(filename: string): Promise<Array<Shape[]>> {
//     const response = await fetch(filename);
//     const frames = await response.json() as unknown as RawFrames;
//     return Object.entries(frames)
//         .map(shapes => getSolidShapes(shapes))
//         .map(shapes => shapes.filter(shape => {
//             const area = shapeArea(shape);
//             const noLargeShapes = shapes.filter(x => shapeArea(x) > 300).length === 0;
//             const isLargest = shape == largestShape(shapes);
//             return area > 600 || (noLargeShapes && isLargest && shapeIsOnSide(shape) && shapeIsNotCircular(shape));
//         }))
//         .map(shapes => shapes.filter(isNotCeilingHeat))
//         .map(smoothKnobblyBits)
//         .map(extendToBottom)
//         //.map(markShoulders)
//         .map(markWidest)
//         .map(markNarrowest)
//         .filter(shapes => shapes.length);
// }

function drawFace(face: FaceInfo | null, canvas: HTMLCanvasElement, threshold: number, smoothedImageData: Float32Array) {
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (face) {
        // Now find the hotspot - only if we have a good lock!
        if (face.headLock === 1.0) {
            const point = getHottestSpotInBounds(
                face,
                threshold,
                120,
                160,
                smoothedImageData
            );
            context.lineWidth = 1;
            context.beginPath();
            context.strokeStyle = "rgba(255, 0, 0, 1)";

            context.arc(point.x - 0.5, point.y - 0.5, 2, 0, Math.PI * 2);
            context.stroke();
        }

        //context.lineWidth = 1;
        if (face.headLock === 1.0) {
            context.strokeStyle = "red";
            //context.lineWidth = 0.5;
        } else if (face.headLock === 0.5) {
            context.strokeStyle = "orange";
        } else {
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

        // context.moveTo(face.forehead.bottomLeft.x, face.forehead.bottomLeft.y);
        // context.lineTo(
        //   face.forehead.bottomRight.x,
        //   face.forehead.bottomRight.y
        // );
        // context.moveTo(face.forehead.topLeft.x, face.forehead.topLeft.y);
        // context.lineTo(face.forehead.topRight.x, face.forehead.topRight.y);
        context.stroke();
    }
}

function drawPoint(p: Point, canvas: HTMLCanvasElement, color = 'green', radius = 2) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawConvexShape(convexHull: ConvexHull, frameNum: number, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
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

function drawShapes(shapes: Shape[], frameNum: number, canvas: HTMLCanvasElement, color:number = 0x33ff00ff) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
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

function drawRawShapes(shapes: RawShape[], frameNum: number, canvas: HTMLCanvasElement, color:number = 0x33ff00ff) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
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


function drawRawShapesIntoMask(shapes: RawShape[], data: Uint8Array, bit: number) {
    const width = 120;
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

function drawShapesIntoMask(shapes: Shape[], data: Uint8Array, bit: number) {
    const width = 120;
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

export type RawShape = Record<number, Span[]>;


function spanOverlapsShape(span: Span, shape: RawShape): boolean {
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

function mergeShapes(shape: RawShape, other: RawShape) {
    const rows = [...Object.keys(shape), ...Object.keys(other)];
    for (const row of rows) {
        const rowN = Number(row);
        if (shape[rowN] && other[rowN]) {
            shape[rowN].push(...other[rowN]);
        } else if (other[rowN]) {
            shape[rowN] = other[rowN];
        }
    }
}

export function getRawShapes(
    thresholded: Uint8Array,
    width: number,
    height: number,
    maskBit: number = 255
): RawShape[] {
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
                } else {
                    span.x1 = x;
                }

                // Either put the span in an existing open shape, or start a new shape with it
                let assignedSpan = false;
                let n = shapes.length;
                let assignedShape;
                while (n !== 0) {
                    const shape = shapes.shift() as RawShape;
                    const overlap = shape && spanOverlapsShape(span, shape);
                    if (overlap) {
                        // Merge shapes
                        if (!assignedSpan) {
                            assignedSpan = true;
                            if (shape[y]) {
                                (shape[y] as Span[]).push(span);
                            } else {
                                shape[y] = [span];
                            }
                            assignedShape = shape;
                            shapes.push(shape);
                        } else {
                            // Merge this shape with the shape the span was assigned to.
                            mergeShapes(assignedShape as RawShape, shape);
                        }
                    } else {
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

const rotate90 = (
    src: Float32Array,
    dest: Float32Array,
): Float32Array => {
    let i = 0;
    const width = 160;
    const height = 120;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            dest[(x * height + y)] = src[i];
            i++;
        }
    }
    return dest;
};

interface Quad {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
}

function pointIsInQuad(p: Point, quad: Quad): boolean {
    return (
        pointIsLeftOfLine(quad.bottomLeft, quad.topLeft, p) &&
        pointIsLeftOfLine(quad.topRight, quad.bottomRight, p) &&
        pointIsLeftOfLine(quad.bottomRight, quad.bottomLeft, p) &&
        pointIsLeftOfLine(quad.topLeft, quad.topRight, p)
    );
}

function offsetRawShape(shapes: RawShape[], offset: Point): RawShape[] {
    const newShapes = [];
    for (const shape of shapes) {
        const newShape: Record<number, Span[]> = {};
        for (const row of Object.values(shape)) {
            for (const span of row) {
                if (!newShape[span.y + offset.y]) {
                    newShape[span.y + offset.y] = [];
                }
                newShape[span.y + offset.y].push({
                    x0: span.x0 + offset.x,
                    x1: span.x1 + offset.x,
                    y: span.y + offset.y,
                    h: span.h
                });
            }
        }
        newShapes.push(newShape);
    }
    return newShapes;
}

function joinShapes(top: Shape, bottom: Shape, quad: Quad): Shape {
    const s: Record<number, Span[]> = {};
    for (const span of top) {
        if (s[span.y]) {
            s[span.y].push(span);
        } else {
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
            const p = {x: quadBounds.x0 + x, y: quadBounds.y0 + y};
            if (pointIsInQuad(p, quad)) {
                const index = y * width + x;
                bitmap[index] = 255;
            }
        }
    }
    const rr = getRawShapes(bitmap, width, height);
    const raw = offsetRawShape(rr, {x: quadBounds.x0, y: quadBounds.y0});
    const r = getSolidShapes(raw);
    if (r.length) {
        for (const span of r[0]) {
            if (s[span.y]) {
                s[span.y].push(span);
            } else {
                s[span.y] = [span];
            }
        }

    }

    for (const span of bottom) {
        if (s[span.y]) {
            s[span.y].push(span);
        } else {
            s[span.y] = [span];
        }
    }

    // TODO(jon): Join shapes needs to fill in the gaps with something
    //const shapes =
    return getSolidShapes([s])[0];
}

const convexHull = (points: Point[], print = false) => {
    // return monotoneConvexHull2D(points).map(i => points[i]);
    // Adapted from https://github.com/eatgrass/convexhull
    // Sort by x and then y for tie-breaking
    points = points.sort((a, b) => {
        const dX = a.x - b.x;
        if (dX === 0) {
            // FIXME(jon): Is this the right order for y?
            return a.y - b.y;
        }
        return dX;
    });

    let bot = 0;
    let top = -1;
    let hull = [];
    let minMin = 0;
    let xMin = points[0].x;

    let i;
    for (i = 1; i < points.length; i++) {
        if(points[i].x !== xMin) {
            break;
        }
    }

    let minMax = i - 1;
    if ( minMax === points.length - 1) {
        hull[++top] = points[minMin];
        if(points[minMax].y !== points[minMin].y)
            hull[++top] = points[minMax];
        hull[++top] = points[minMin];
        return hull;
    }

    let maxMin, maxMax = points.length - 1;
    let xMax = points[points.length - 1].x;

    for (i = points.length -2; i >= 0; i--) {
        if (points[i].x !== xMax) {
            break;
        }
    }
    maxMin = i + 1;
    hull[++top] = points[minMin];
    i = minMax;

    while (++i <= maxMin) {
        if (pointIsLeftOfOrOnLine(points[minMin],points[maxMin], points[i]) && i < maxMin) {
            continue;
        }
        while (top > 0) {
            if (pointIsLeftOfLine(hull[top - 1], hull[top], points[i])) { // Maybe missing a straight line case?
                break;
            } else {
                top--;
            }
        }
        hull[++top] = points[i];
    }
    if (maxMax !== maxMin) {
        hull[++top] = points[maxMax];
    }
    bot = top;
    i = maxMin;

    while (--i >= minMax) {
        if (pointIsLeftOfOrOnLine(points[maxMax], points[minMax], points[i]) && i > minMax) {
            continue;
        }
        while (top > bot) {
            if (pointIsLeftOfLine(hull[top - 1], hull[top], points[i])) {
                break;
            } else {
                top--;
            }
        }
        if (points[i].x === hull[0].x && points[i].y === hull[0].y) {
            return hull;
        }
        hull[++top] = points[i];
    }
    if (minMax !== minMin) {
        hull[++top] = points[minMin];
    }
    return hull;
}

type ConvexHull = Point[];

function boundsForConvexHull(hull: ConvexHull): Rect {
    const x0 = hull.reduce((minX, point) => (point.x < minX ? point.x : minX), hull[0].x);
    const x1 = hull.reduce((maxX, point) => (point.x > maxX ? point.x : maxX), hull[0].x);
    const y0 = hull.reduce((minY, point) => (point.y < minY ? point.y : minY), hull[0].y);
    const y1 = hull.reduce((maxY, point) => (point.y > maxY ? point.y : maxY), hull[0].y);
    return {x0, x1, y0, y1};
}

function monotoneConvexHull2D(points: Point[]) {
    const n = points.length;
    if(n < 3) {
        const result = new Array(n)
        for(let i=0; i<n; ++i) {
            result[i] = i;
        }

        if(n === 2 &&
            points[0].x === points[1].y &&
            points[0].x === points[1].y) {
            return [0]
        }
        return result;
    }

    //Sort point indices along x-axis
    const sorted = new Array(n)
    for(let i = 0; i < n; ++i) {
        sorted[i] = i;
    }
    sorted.sort(function(a,b) {
        const d = points[a].x - points[b].x
        if (d) {
            return d
        }
        return points[a].y - points[b].y
    })

    //Construct upper and lower hulls
    const lower = [sorted[0], sorted[1]];
    const upper = [sorted[0], sorted[1]];

    for(let i=2; i<n; ++i) {
        let idx = sorted[i];
        let p   = points[idx];

        //Insert into lower list
        let m = lower.length;
        while(m > 1 && pointIsLeftOfOrOnLine(
            points[lower[m-2]],
            points[lower[m-1]],
            p)) {
            m -= 1
            lower.pop()
        }
        lower.push(idx)

        //Insert into upper list
        m = upper.length
        while(m > 1 && pointIsLeftOfOrOnLine(
            points[upper[m-2]],
            points[upper[m-1]],
            p)) {
            m -= 1
            upper.pop()
        }
        upper.push(idx)
    }

    //Merge lists together
    const result = new Array(upper.length + lower.length - 2);
    let ptr    = 0
    for(let i=0, nl=lower.length; i<nl; ++i) {
        result[ptr++] = lower[i];
    }
    for(let j=upper.length-2; j>0; --j) {
        result[ptr++] = upper[j];
    }

    //Return result
    return result;
}

function convexHullForShape(shape: Shape): ConvexHull {
    const points = [];
    for (const span of shape) {
        points.push({x: span.x0, y: span.y});
        points.push({x: span.x1, y: span.y});
    }
    return convexHull(points);
    // TODO(jon): Need to "rasterize" the convex hull back to our span based form.
    //  Get the bounds of the convex hull, then iterate through each pixel and check whether or not they are outside
    //  the shape (maybe divide into triangles, and use pointInsideTriangle?)
}

function topPoints(hull: ConvexHull): {left: Point, right: Point} {
    const topY = hull.reduce((minY, {y}) => (y < minY ? y : minY), Number.MAX_SAFE_INTEGER);
    const topPoints = hull.filter(({y}) => (y - topY <= 20));
    const left = topPoints.reduce((best, curr) => (curr.x < best.x ? curr : best), {x: Number.MAX_SAFE_INTEGER, y: 0});
    const right = topPoints.reduce((best, curr) => (curr.x > best.x ? curr : best), {x: 0, y: 0});
    return {left, right};
}

function bottomPoints(hull: ConvexHull): {left: Point, right: Point} {
    const bottomY = hull.reduce((maxY, {y}) => (y > maxY ? y : maxY), 0);
    const bottomPoints = hull.filter(({y}) => (bottomY - y <= 20));
    const left = bottomPoints.reduce((best, curr) => (curr.x < best.x ? curr : best), {x: Number.MAX_SAFE_INTEGER, y: 0});
    const right = bottomPoints.reduce((best, curr) => (curr.x > best.x ? curr : best), {x: 0, y: 0});
    return {left, right};
}

function closestPoint(point: Point, points: Point[]): Point {
    let bestP;
    let bestD = Number.MAX_SAFE_INTEGER;
    for (const p of points) {
        const d = distanceSq(p, point);
        if (d < bestD) {
            bestD = d;
            bestP = p;
        }
    }
    return bestP as Point;
}

function mergeHeadParts(shapes: Shape[], frameNumber: number): {shapes: Shape[], didMerge: boolean} {
    const mergedShapes: Shape[] = [];
    if (shapes.length) {
        const largest = largestShape(shapes);
        const hullA = convexHullForShape(largest);

        // FIXME(jon): Seems like in a lot of cases the corners of the image are more correct?
        //const boundsA = boundsForConvexHull(hullA);
        // Would this be better as closest points to bounding box corners?
        //const lTopLeft = closestPoint({x: boundsA.x0, y: boundsA.y0 }, hullA);
        const lTopLeft = closestPoint({x: 0, y: 0 }, hullA);
        //const lTopRight = closestPoint({x: boundsA.x1, y: boundsA.y0 }, hullA);


        const lTopRight = closestPoint({x: 120, y: 0 }, hullA);
        // const lBottomLeft = closestPoint({x: boundsA.x0, y: boundsA.y1 }, hullA);
        // const lBottomRight = closestPoint({x: boundsA.x1, y: boundsA.y1 }, hullA);
        const lBottomLeft = closestPoint({x: 0, y: 160 }, hullA);
        const lBottomRight = closestPoint({x: 120, y: 160 }, hullA);
        //const {left: lTopLeft, right: lTopRight} = topPoints(hullA);
        //const {left: lBottomLeft, right: lBottomRight} = bottomPoints(hullA);
        let merged = false;
        for (const shape of shapes) {
            const shapeA = shapeArea(shape);
            if (shape !== largest && shapeA > 100) {
                const hullB = convexHullForShape(shape);
                const boundsB = boundsForConvexHull(hullB);
                const d = 20 * shapeA;
                const maxDX = 30;// * Math.floor(shapeA / 100);
                {
                    // const {left: bottomLeft, right: bottomRight} = bottomPoints(hullB);
                    const bottomLeft = closestPoint({x: boundsB.x0, y: boundsB.y1 }, hullB);
                    const bottomRight = closestPoint({x: boundsB.x1, y: boundsB.y1 }, hullB);
                    if ((distance(lTopLeft, bottomLeft) < d && distance(lTopRight, bottomRight) < d) && Math.abs(lTopLeft.x - bottomLeft.x) < maxDX && Math.abs(lTopRight.x - bottomRight.x) < maxDX) {
                        mergedShapes.push(joinShapes(shape, largest, {topLeft: bottomLeft, topRight: bottomRight, bottomLeft: lTopLeft, bottomRight: lTopRight}));
                        merged = true;
                    }
                }
                {
                    //const {left: topLeft, right: topRight} = topPoints(hullB);
                    const topLeft = closestPoint({x: boundsB.x0, y: boundsB.y0 }, hullB);
                    const topRight = closestPoint({x: boundsB.x1, y: boundsB.y0 }, hullB);
                    if (!merged && (distance(topLeft, lBottomLeft) < d && distance(topRight, lBottomRight) < d) && Math.abs(topLeft.x - lBottomLeft.x) < maxDX && Math.abs(topRight.x - lBottomRight.x) < maxDX) {
                        mergedShapes.push(joinShapes(largest, shape, {topLeft, topRight, bottomRight: lBottomRight, bottomLeft: lBottomLeft}));
                        merged = true;
                    }
                }
            }
        }
        return merged ? {shapes: mergedShapes, didMerge: true} : {shapes: [largest], didMerge: false};
    }
    return {shapes: mergedShapes, didMerge: false};
}

export function preprocessShapes(frameShapes: RawShape[], frameNumber: number, thermalReference: ROIFeature | null): { shapes: Shape[], didMerge: boolean } {
    let shapes = getSolidShapes(frameShapes);
    // Find the largest shape, and then see if there are any other reasonable sized shapes directly
    // above or below that shape.  If there are, they may be the other half of a head cut in half by glasses,
    // and should be merged.
    if (thermalReference) {
        shapes = shapes.filter(shape => {
            const shapeBounds = boundsForShape(shape);
            const area = shapeArea(shape);
            const boundsFilled = (shapeBounds.x1 + 1 - shapeBounds.x0) * (shapeBounds.y1 + 1 - shapeBounds.y0);
            const ratioFilled = area / boundsFilled;

            // TODO(jon): Can also check to see if the top of a shape is flat, or if the side is flat too etc.
            if (ratioFilled > 0.9) {
                //return false;
            }

            const maxVariance = 5;
            return !(
                distance({x: shapeBounds.x0, y: shapeBounds.y0}, {x: thermalReference.x0, y: thermalReference.y0}) < maxVariance &&
                distance({x: shapeBounds.x1, y: shapeBounds.y0}, {x: thermalReference.x1, y: thermalReference.y0}) < maxVariance &&
                distance({x: shapeBounds.x0, y: shapeBounds.y1}, {x: thermalReference.x0, y: thermalReference.y1}) < maxVariance &&
                distance({x: shapeBounds.x1, y: shapeBounds.y1}, {x: thermalReference.x1, y: thermalReference.y1}) < maxVariance
            );
        });
    }
    shapes = shapes.filter(isNotCeilingHeat);

    // TODO(jon): Exclude the thermal reference first.
    let {shapes: mergedShapes, didMerge} = mergeHeadParts(shapes, frameNumber);
    return (
        {shapes: mergedShapes
            // .filter(shape => {
            //     const area = shapeArea(shape);
            //     const noLargeShapes =
            //         shapes.filter(x => shapeArea(x) > 300).length === 0;
            //     const isLargest = shape == largestShape(mergedShapes);
            //     return (
            //         area > 600 ||
            //         (noLargeShapes &&
            //             isLargest &&
            //             shapeIsOnSide(shape) &&
            //             shapeIsNotCircular(shape))
            //     );
            // })
            //.filter(isNotCeilingHeat)
            // .map(markWidest)
            // .map(markNarrowest)
            .filter(mergedShapes => mergedShapes.length),
            didMerge
        }
    );
}

export function sobelX(
    source: Float32Array,
    index: number,
    width: number
): number {
    return (
        -source[index - 1 - width] +
        source[index + 1 - width] -
        2 * source[index - 1] +
        2 * source[index + 1] -
        source[index - 1 + width] +
        source[index + 1 + width]
    );
}


function subtractFrame(frame: Float32Array, prevFrame: Float32Array | null, motionBit: number): {m: number, mx: number, motionMask: Uint8Array} {
    if (!prevFrame) {
        return {motionMask: new Uint8Array(frame), m: -1, mx: -1};
    } else {
        let m = Number.MAX_SAFE_INTEGER;
        let mx = 0;
        const subtracted = new Uint8Array(160*120);
        for (let i = 0; i < subtracted.length; i++) {
            // Also compare with sobel edges?
            // Then do a shrink-wrapped convex hull around the points we have.
            if (Math.abs(frame[i] - prevFrame[i]) > 20) {
                subtracted[i] |= motionBit;
            }
        }
        return {motionMask: subtracted, m, mx };
    }
}

function allNeighboursEqual(x: number, y: number, data: Uint8Array, bit: number): boolean {
    const w = 120;
    const top = data[(y - 1) * w + x];
    const topLeft = data[(y - 1) * w + (x - 1)];
    const topRight = data[(y - 1) * w + (x + 1)];
    const left = data[(y) * w + (x - 1)];
    const right = data[(y) * w + (x + 1)];
    const bottom = data[(y + 1) * w + x];
    const bottomLeft = data[(y + 1) * w + (x - 1)];
    const bottomRight = data[(y + 1) * w + (x + 1)];
    return (
        top === bit &&
        topRight === bit &&
        right === bit &&
        bottomRight === bit &&
        bottom === bit &&
        bottomLeft === bit &&
        left === bit &&
        topLeft === bit
    );
}

function localDensity(x: number, y: number, data: Uint8Array, bit: number): number {
    const x0 = Math.max(x - 2, 0);
    const x1 = Math.min(x + 2, 119);
    const y0 = Math.max(y - 2, 0);
    const y1 = Math.min(y + 2, 159);
    let sum = 0;
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const index = y * 120 + x;
            if (data[index] === bit) {
                sum++;
            }
        }
    }
    return sum;
}


function distToSegmentSquared(p: Point, v: Vec2, w: Vec2): number {
    const l2 = distanceSq(v, w);
    if (l2 == 0) {
        return distanceSq(p, v);
    }
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return distanceSq(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

function directionOfSet(set: Point[]): {v: Vec2, y: number} {
    // What's a good way to get the current average direction?
    // This is "least squares"
    const meanX = set.reduce((acc, {x}) => acc + x, 0) / set.length;
    const meanY = set.reduce((acc, {y}) => acc + y, 0) / set.length;
    let num = 0;
    let den = 0;
    for (const p of set) {
        num += (p.x - meanX) * (p.y - meanY);
        den += (p.x - meanX) ** 2;
    }
    const gradient = num / den;
    const yIntercept = meanY - gradient * meanX;
    //return {x: gradient, y: yIntercept};
    return {v: normalise({x: 1, y: gradient}), y: yIntercept};
}

const pointsAreEqual = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;
const pointIsInSet = (pt: Point, set: Point[]): boolean => set.find(x => pointsAreEqual(x, pt)) !== undefined;

function drawImage(canvas: HTMLCanvasElement, canvas2: HTMLCanvasElement, data: Uint8Array, frameNumber: number) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const ctx2 = canvas2.getContext('2d') as CanvasRenderingContext2D;
    const imageData = new ImageData(new Uint8ClampedArray(160 * 120 * 4), 120, 160);
    const image = new Uint32Array(imageData.data.buffer);
    const edgePoints: Point[] = [];

    const newMask = new Uint8Array(120*160);
    let pp = [];
    const yellow = 0xff00ffff;
    const cyan = 0xffffff00;
    const red = 0xff0000ff;
    const blue = 0xffff0000;
    const green = 0xff00ff00;
    for (let y = 0; y < 160; y++) {
        let prev = 0;
        let opened = false;
        let hasMotion = false;
        for (let x = 0; x < 120; x++) {
            const i = y * 120 + x;
            const v = data[i];
            if (v & motionBit) {
                hasMotion = true;
            }
            if (x > 0 && prev === 0 && (v & thresholdBit)) {
                //image[i] = red;
            } else if (prev & thresholdBit && v === 0) {
                //image[i] = blue;
            } else if (v & edgeBit && v & thresholdBit && !allNeighboursEqual(x, y, data, edgeBit)) {
                newMask[i] = 1;
            } else if (v & edgeBit && v & motionBit && !allNeighboursEqual(x, y, data, motionBit)) {
                newMask[i] = 2;
            }

            // if (v & motionBit && v && thresholdBit && v & edgeBit && prev === motionBit) {
            //     if (!allNeighboursEqual(x, y, data, motionBit)) {
            //         opened = true;
            //         image[i] = yellow;
            //         edgePoints.push({x, y});
            //         pp.push([x, y]);
            //     }
            // }
            // else if (v & motionBit && v & thresholdBit && prev === motionBit) {
            //     if (!allNeighboursEqual(x, y, data, motionBit)) {
            //         opened = true;
            //         image[i] = yellow;
            //         edgePoints.push({x, y});
            //         pp.push([x, y]);
            //     }
            // }
            // else if (v & motionBit && v && thresholdBit && v & edgeBit) {
            //     //image[i] = 0xff0000ff; // Red
            // } else if (v & motionBit && v & thresholdBit) {
            //     //image[i] = 0x990000ff; // Blue
            // } else if (v & motionBit && v & edgeBit) {
            //     // Never happens
            //     //image[i] = 0xff00ff00;
            // } else if (v & thresholdBit && v & edgeBit) {
            //     //image[i] = 0xffffffff;
            // } else if (v & motionBit) { // No threshold bit set
            //     //image[i] = 0xffffff00; // Cyan
            //     if (opened) {
            //         if (prev & motionBit && prev && thresholdBit && prev & edgeBit) {
            //             if (!allNeighboursEqual(x - 1, y, data, motionBit)) {
            //                 image[i - 1] = yellow; // Red
            //                 edgePoints.push({x: x - 1, y});
            //                 pp.push([x - 1, y]);
            //             }
            //         } else if (prev & motionBit && prev & thresholdBit) {
            //             if (!allNeighboursEqual(x - 1, y, data, motionBit)) {
            //                 image[i - 1] = yellow; // Blue
            //                 edgePoints.push({x: x - 1, y});
            //                 pp.push([x - 1, y]);
            //             }
            //         }
            //         //opened = false;
            //     }
            // } else if (v & thresholdBit) {
            //     //image[i] = 0x3300ff00; // green
            // } //else if (v & edgeBit) {
            // //     image[i] = 0x99ffffff; // Yellow
            // // } else {
            // //     image[i] = 0x00000000;
            // // }
            prev = v;
        }
    }
    const nnMask = new Uint8Array(120*160);
    for (let y = 0; y < 160; y++) {
        for (let x = 0; x < 120; x++) {
            const i = y * 120 + x;
            if (newMask[i] === 1 && localDensity(x, y, newMask, 1) >= 3) {
                nnMask[i] = 1;
            }
            // if (newMask[i] === 2) {
            //     nnMask[i] = 2;
            // }
            else if (newMask[i] === 2 && localDensity(x, y, newMask, 2) >= 3) {
                nnMask[i] = 2;
            }
            if (nnMask[i] === 1) {
                //image[i] = cyan;
                pp.push({x, y});
            } else if (nnMask[i] === 2) {
                //image[i] = yellow;
                pp.push({x, y});
            }
        }
    }
    if (pp.length > 10) {

        // TODO(jon): Also add the edges of the threshold to pp?

        // TODO(jon): Work out the center of mass of pp, and then remove any points that are too far from it.
        // let aX = 0;
        // let aY = 0;
        // for (const {x, y} of pp) {
        //     aX += x;
        //     aY += y;
        // }
        // const center = {x: aX / pp.length, y: aY / pp.length };
        // const dP = pp.map(x => ({p: x, d: distanceSq(x, center)}));
        // dP.sort((a, b) => a.p.x - b.p.x);
        // const ppp: Set<Point> = new Set();
        // let first = dP[0];
        // // FIXME(jon): Sort by x, then y, then distance?  Look for gaps in x, look for gaps in y
        // for (let i = 1; i < dP.length; i++) {
        //     const dDiff = Math.abs(dP[i].p.x - first.p.x);
        //     if (dDiff <= 5) {
        //         ppp.add(dP[i].p);
        //     } else {
        //         break;
        //     }
        //     first = dP[i];
        // }
        //
        // dP.sort((a, b) => a.p.y - b.p.y);
        // first = dP[0];
        // for (let i = 1; i < dP.length; i++) {
        //     const dDiff = Math.abs(dP[i].p.y - first.p.y);
        //     if (dDiff <= 5) {
        //         ppp.add(dP[i].p);
        //     } else {
        //         break;
        //     }
        //     first = dP[i];
        // }
        // TODO(jon): Also remove small clusters? - Or check the distance from each cluster to the center of mass
        //  of other clusters.
        const clusters = DBScan({
            dataset: pp,
            epsilon: 5 * 5,
            distanceFunction: distanceSq,
            minimumPoints: 3
        });
        const largestCluster = (arr: number[][]): number[] => (arr.reduce((acc: number[], val: number[]) => {
            if (val.length > acc.length) {
                return val;
            }
            return acc;
        }, []));
        // const ppp = [];
        const colors = [
            cyan,
            red,
            yellow,
            blue,
            green,
        ];
        const ppp = [];
        if (clusters.clusters.length) {
            let i = 0;
            for (const cluster of clusters.clusters) {
                if (cluster.length < 15) {
                    let anyPointIsOnThresholdPlusMotion = false;
                    for (const pointIndex of cluster) {
                        const point: Point = pp[pointIndex];
                        const index = 120 * point.y + point.x;
                        const v = data[index];
                        if (v & motionBit && v & thresholdBit) {
                            anyPointIsOnThresholdPlusMotion = true;
                            break;
                        }
                    }
                    for (const pointIndex of cluster) {
                        const point: Point = pp[pointIndex];
                        const index = 120 * point.y + point.x;
                        if (anyPointIsOnThresholdPlusMotion) {
                            image[index] = colors[i % colors.length];
                            ppp.push(point);
                        }
                    }
                } else {
                    for (const pointIndex of cluster) {
                        const point: Point = pp[pointIndex];
                        const index = 120 * point.y + point.x;
                        ppp.push(point);
                        image[index] = colors[i % colors.length];
                    }
                }
                i++;
            }
        }
        //pp = pp.filter((v, index) => !clusters.noise.includes(index));
        // ctx2.beginPath();
        // ctx2.fillStyle = 'red';
        // ctx2.arc(center.x, center.y, 2, 0, Math.PI * 2);
        // ctx2.fill();

        //const concaveHull = concaveman(pp, 2);
        if (ppp.length > 15) {
            let hull = fastConvexHull(ppp.map(({x, y}) => [x, y]));


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
            ctx2.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx2.moveTo(hull[0][0], hull[0][1]);
            for (const [x, y] of hull.slice(1)) {
                ctx2.lineTo(x, y);
            }
            ctx2.lineTo(hull[0][0], hull[0][1]);
            ctx2.stroke();

            if (false && hull.length > 4) {


                const angleBetween = (a: [number, number], b: [number, number], c: [number, number]): number => {
                    let aa = {x: a[0], y: a[1] };
                    let bb = {x: b[0], y: b[1] };
                    let cc = {x: c[0], y: c[1] };
                    let v1 = sub(bb, aa);
                    let v2 = sub(cc, aa);
                    const slopeDiff = (v1.y / v1.x) - (v2.y / v2.x);
                    //debugger;
                    //console.log(slopeDiff);
                    return Math.abs(slopeDiff);
                    //return Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0]);
                };
                const radToDeg = (rad: number): number => (rad * (180 / Math.PI));
                let kk = 0;
                let leftInnerX = hull[kk][0];
                while (Math.abs(hull[kk][0] - leftInnerX) < 3) {
                    kk++;
                }
                kk--;
                let l = hull[kk];
                ctx2.beginPath();
                ctx2.fillStyle = 'orange';
                ctx2.arc(l[0], l[1], 2, 0, Math.PI * 2);
                ctx2.fill();
                kk++;
                const maxAngle = 0.03;
                const print = frameNumber === 27 || frameNumber === 28;
                if (print) {
                    console.log(kk, angleBetween(l, hull[kk + 1], hull[kk + 2]));
                }
                while (angleBetween(l, hull[kk + 1], hull[kk + 2]) < maxAngle && kk < hull.length - 1) {
                    kk++;
                }
                const leftInner = hull[kk];
                ctx2.beginPath();
                ctx2.fillStyle = 'red';
                ctx2.arc(leftInner[0], leftInner[1], 2, 0, Math.PI * 2);
                ctx2.fill();

                kk = hull.length - 1;
                let rightInnerX = hull[kk][0];
                while (Math.abs(hull[kk][0] - rightInnerX) < 3) {
                    kk--;
                }
                kk++;
                l = hull[kk];
                ctx2.beginPath();
                ctx2.fillStyle = 'orange';
                ctx2.arc(l[0], l[1], 2, 0, Math.PI * 2);
                ctx2.fill();
                if (print) {
                    console.log(kk, angleBetween(l, hull[kk - 1], hull[kk - 2]));
                }
                while (angleBetween(l, hull[kk - 1], hull[kk - 2]) < maxAngle && kk > 0) {
                    kk--;
                }
                const rightInner = hull[kk];
                ctx2.beginPath();
                ctx2.fillStyle = 'green';
                ctx2.arc(rightInner[0], rightInner[1], 2, 0, Math.PI * 2);
                ctx2.fill();
                // TODO(jon): Also make sure the angle between line segments is past a certain threshold, so the points are not sitting on a more-or-less straight line.

                ctx2.beginPath();
                ctx2.strokeStyle = 'blue';
                ctx2.moveTo(leftInner[0], leftInner[1]);
                ctx2.lineTo(rightInner[0], rightInner[1]);
                ctx2.stroke();
                //
                //
                // let k = 1;
                //
                // const leftInner = hull[k];
                // k = hull.length - 1;
                // l = hull[k];
                // while (Math.abs(radToDeg(angleBetween(l, hull[k]))) < 0.1 && k > 1) {
                //     k--;
                // }
                // const rightInner = hull[k];




                //
                // ctx2.beginPath();
                // ctx2.fillStyle = 'green';
                // ctx2.arc(rightInner[0], rightInner[1], 2, 0, Math.PI * 2);
                // ctx2.fill();
            }


            /*
            const pts = new Uint8Array(concaveHull.length * 2);
            let ptr = 0;
            for (let i = 0; i < concaveHull.length; i++) {
                pts[ptr++] = concaveHull[i][0];
                pts[ptr++] = concaveHull[i][1];
            }
            drawCurveFromPoints(pts, ctx2);
            */
        }
    }

    if (false) {
        edgePoints.sort((a, b) => {
            const cmp = a.y - b.y;
            if (cmp === 0) {
                return a.x - b.x;
            }
            return cmp;
        });
        const distanceThreshold = 5 * 5;
        const start = performance.now();
        let ss = 0;
        if (edgePoints.length) {
            const dedupPSet: Set<string> = new Set();
            for (const p of edgePoints) {
                dedupPSet.add(JSON.stringify(p));
            }
            const edgePSet: Set<Point> = new Set();
            for (const p of dedupPSet) {
                edgePSet.add(JSON.parse(p) as Point);
            }
            console.log(edgePSet.size, edgePoints.length);
            // Take first point, then scan through y and split into sets?
            let sets = [[edgePoints[0]]];
            let lastPt = {x: 0, y: 0};
            for (const pt of edgePSet) {
                console.assert(!pointsAreEqual(lastPt, pt));
                lastPt = pt;
                let matchedPrevSet = false;
                for (const set of sets) {
                    const lastP = set[set.length - 1];
                    if (distanceSq(lastP, pt) < distanceThreshold && !pointIsInSet(pt, set)) {
                        set.push(pt);
                        console.assert(edgePSet.has(pt));
                        console.assert(edgePSet.delete(pt));
                        matchedPrevSet = true;
                        break;
                    }
                }
                if (!matchedPrevSet) {
                    // Start a new set with curr
                    edgePSet.delete(pt);
                    sets.push([pt]);
                }
                //if (pt.y < 159) {
                //for (const set of sets) {

                /*
                // TODO(jon): First look further ray-casting in the direction of the current set line/average.
                // get the current average direction vector.
                if (pointIsInSet(pt, set)) {
                    continue;
                }
                if (set.length > 2) {
                    // TODO(jon): Do we need to make this part of the set start from a zero origin for this to work
                    //  properly?

                    // TODO(jon): Detect the case where the segment is a straight line in x or y.
                    const slice = set.slice(0, Math.min(5, set.length - 1));
                    const firstX = slice[0].x;
                    const firstY = slice[0].y;
                    let sameX = true;
                    let sameY = true;
                    for (const p of slice.slice(1)) {
                        if (p.x !== firstX) {
                            sameX = false;
                        }
                        if (p.y !== firstY) {
                            sameY = false;
                        }
                    }
                    let dir;
                    if (sameX) {
                        dir = {x: 0, y: 1};
                    } else if (sameY) {
                        dir = {x: 1, y: 0};
                    } else {
                        const dd = directionOfSet(slice);
                        //console.log(dd);
                        dir = dd.v;
                    }
                    const startP = set[set.length - 1];
                    //console.log('searching from ', startP, 'to join with ', pt, 'in ', dir);
                    // Now ray-cast until we find something, or get too far away.

                    // We should be trying to find an existing edge to join 'curr' to.

                    // Maybe make a long line in the direction dir, and then look to see if at any stage
                    // curr is < threshold distance from the line?
                    const endP = add(startP, scale(dir, distanceThreshold));
                    console.log("searching for match to", pt, 'from startP', startP);
                    if (distToSegmentSquared(pt, startP, endP) < distanceThreshold) {
                        ctx2.save();
                        ctx2.beginPath();
                        ctx2.strokeStyle = 'red';
                        ctx.lineWidth = 0.5;
                        ctx2.moveTo(startP.x, startP.y);
                        ctx2.lineTo(endP.x, endP.y);
                        ctx2.stroke();
                        ctx2.beginPath();
                        ctx2.fillStyle = 'blue';
                        ctx2.arc(endP.x, endP.y, 1, 0, Math.PI * 2);
                        ctx2.fill();
                        ctx2.restore();
                        // TODO(jon): Once we've found a join point, we can continue adding greedily from that
                        //  point.
                        console.log('joining', startP, pt);
                        console.assert(edgePSet.delete(pt));
                        console.assert(!edgePSet.has(pt));
                        matchedPrevSet = true;
                        set.push(pt);
                        // TODO(jon): This doesn't seem to be breaking properly?
                        break;
                    }
                }
                */

                //}

                //}
            }

            // TODO(jon): At the end go through each length from the start, and try and merge sets to the ends of other lengths.
            // At least, if two line set end-points are within 10px of each other, join them up?

            let all = sets.filter(s => s.length > 3);
            let allS: Set<Point[]> = new Set();
            for (const set of all) {
                allS.add(set);
            }
            {
                console.log("unmerged sets", allS.size, allS);
                // Merging sets
                for (const a of allS) {
                    //console.log('finding matches for set', a);
                    for (const b of allS) {
                        if (a !== b) {
                            const startPB = b[0];
                            const endPB = b[b.length - 1];
                            if (
                                distanceSq(a[0], startPB) < 25 ||
                                distanceSq(a[0], endPB) < 25 ||
                                distanceSq(a[a.length - 1], startPB) < 25 ||
                                distanceSq(a[a.length - 1], endPB) < 25
                            ) {
                                console.log('mergin close endpoints');
                                // merge.
                                allS.delete(b);
                                a.unshift(...b.reverse());
                                break; // ?
                            }

                            const startSliceA = head(a).reverse();
                            const endSliceA = tail(a);
                            if (lineSetsJoin(startSliceA, startPB, ctx2)) {
                                // merge.
                                allS.delete(b);
                                a.unshift(...b.reverse());
                                break; // ?
                            } else if (lineSetsJoin(startSliceA, endPB, ctx2)) {
                                allS.delete(b);
                                a.unshift(...b);
                                break; // ?
                            } else if (lineSetsJoin(endSliceA, startPB, ctx2)) {
                                allS.delete(b);
                                a.push(...b);
                                break; // ?
                            } else if (lineSetsJoin(endSliceA, endPB, ctx2)) {
                                allS.delete(b);
                                a.push(...b.reverse()); // ??
                                break; // ?
                            }
                        }
                    }
                }
                console.log("merged sets", allS.size);
            }

            for (const setA of allS) {
                let b = boundsForConvexHull(setA);
                for (const setB of allS) {
                    if (setA !== setB) {
                        const bB = boundsForConvexHull(setB);
                        if (Math.abs(bB.y1 - b.y0) > 10 || Math.abs(bB.y0 - b.y1) > 10) {
                            continue;
                        }
                        if (Math.abs(bB.x0 - b.x1) <= 10 || Math.abs(bB.x1 - b.x0) <= 10) {
                            setA.push(...setB);
                            allS.delete(setB);
                            // TODO(jon): Union bounds, will be more efficient.
                            b = boundsForConvexHull(setA);
                        }
                    }
                }
            }

            // NOTE(jon): If there are two sets of reasonable length still, and each one has it's lowestY as the first element,
            //  look at joining them as two sides of the same shape.
            for (const set of allS) {

            }

            // If the boundingboxes are within 10 pixels in x of each other, join?
            //const bounds = Array.from(allS).map(h => ({s: h, b: boundsForConvexHull(h)}));

            const setsOfReasonableLength = Array.from(allS).filter(x => x.length > 30);
            if (setsOfReasonableLength.length === 2) {
                // const setOne = setsOfReasonableLength[0].sort((a, b) => a.y - b.y);
                // const setTwo = setsOfReasonableLength[1].sort((a, b) => a.y - b.y);
                setsOfReasonableLength[0].push(...setsOfReasonableLength[1]);
                allS.delete(setsOfReasonableLength[1]);
            }
            console.log(allS);
            // console.log(sets.reduce((acc, s) => acc + s.length, 0), edgePoints.length);
            // console.log(sets);
            const colors = [
                0xffff00ff,
                0xff0000ff,
                0xffff0000,
                // 0xff0000ff,
                // 0xff00ff00,
                // 0xff000000,
                // 0xffff00ff,
                // 0xffff00ff,
            ];
            let c = 0;

            for (const set of allS) {
                //if (set.length > 30) {
                const points = [];
                const color = colors[c % colors.length];

                // TODO(jon): Arrange lines to left and right of mid-point.
                // Middle of the line set is the top-most y:

                if (set.length > 50) {
                    // Extend the set to the bottom of the frame.
                    let start = set[0];
                    let end = set[set.length - 1];
                    console.log(JSON.stringify({start, end}, null, '\t'));
                    while (start.y < 159) {
                        start = {x: start.x, y: start.y + 1};
                        set.unshift(start);
                    }
                    while (end.y < 159) {
                        end = {x: end.x, y: end.y + 1};
                        set.push(end);
                    }

                    const bottom = boundsForConvexHull(set.filter(x => x.y == 159));
                    for (let i = bottom.x0; i < bottom.x1; i++) {
                        set.push({x: i, y: 159});
                    }

                    for (const {x, y} of set) {
                        points.push([x, y]);
                        image[y * 120 + x] = color;
                    }
                    const concaveHull = concaveman(points, 2);
                    ctx2.beginPath();
                    ctx2.strokeStyle = 'rgba(0, 255, 0, 1)';
                    ctx2.moveTo(concaveHull[0][0], concaveHull[0][1]);
                    for (const [x, y] of concaveHull.slice(1)) {
                        ctx2.lineTo(x, y);
                    }
                    ctx2.stroke();
                }
                //}
                c++;
            }

            // TODO(jon): Draw this
        }
        const end = performance.now();
        console.log('matching', end - start);
    }
    //console.log('concave', end - ss);
    ctx.putImageData(imageData, 0, 0);
}

const maxSliceLength = 5;
const minYIndex = (arr: Point[]): number => {
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
const head = (arr: Point[]): Point[] => arr.slice(0, Math.min(maxSliceLength, arr.length - 1));
const tail = (arr: Point[]): Point[] => arr.slice((arr.length - 1) - Math.min(maxSliceLength, arr.length) + 1, Math.min(maxSliceLength, arr.length) + 1);

function lineSetsJoin(setSection: Point[], point: Point, ctx: CanvasRenderingContext2D): boolean {
    const distanceThreshold = 5 * 5;
    if (!setSection.length) {
        return false;
    }
    const firstX = setSection[0].x;
    const firstY = setSection[0].y;
    let sameX = true;
    let sameY = true;
    for (const p of setSection.slice(1)) {
        if (p.x !== firstX) {
            sameX = false;
        }
        if (p.y !== firstY) {
            sameY = false;
        }
    }
    let dir;

    // Detect whether it's just a straight line in x or y
    if (sameX) {
        dir = {x: 0, y: 1};
    } else if (sameY) {
        dir = {x: 1, y: 0};
    } else {
        const dd = directionOfSet(setSection);
        //console.log(dd);
        dir = dd.v;
    }

    const startP = setSection[setSection.length - 1];
    //console.log('searching from ', startP, 'to join with ', pt, 'in ', dir);
    // Now ray-cast until we find something, or get too far away.

    // We should be trying to find an existing edge to join 'curr' to.

    // Maybe make a long line in the direction dir, and then look to see if at any stage
    // curr is < threshold distance from the line?
    const endP = add(startP, scale(dir, distanceThreshold));
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 0.5;
    ctx.moveTo(startP.x, startP.y);
    ctx.lineTo(endP.x, endP.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = 'blue';
    ctx.arc(endP.x, endP.y, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (distToSegmentSquared(point, startP, endP) < distanceThreshold * 2) {
        return true;
    }
    // Now we have the direction of the line, and can cast out towards b, and see if they intersect.
    return false;
}

function drawImage2(canvas: HTMLCanvasElement, data: Float32Array, min: number, max: number) {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const img = ctx.getImageData(0, 0, 120, 160);
    const imageData = new Uint32Array(img.data.buffer);
    const range = (max - min);
    for (let i = 0; i < data.length; i++) {
        const v = Math.max(0, Math.min(255, ((data[i] - min) / range) * 255.0));
        imageData[i] = 0xff << 24 | v << 16 | v << 8 | v;
    }
    ctx.putImageData(img, 0, 0);
}

function drawCurveFromPoints(pointsArray: Uint8Array, canvas: HTMLCanvasElement | CanvasRenderingContext2D) {
    let ctx;
    if (canvas instanceof CanvasRenderingContext2D) {
        ctx = canvas;
    } else {
        ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
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
                ctx.bezierCurveTo(
                    bezierPts[i],
                    bezierPts[i + 1],
                    bezierPts[i + 2],
                    bezierPts[i + 3],
                    bezierPts[i + 4],
                    bezierPts[i + 5]
                );
            }
            ctx.stroke();
        }
        ctx.save();
    }
}

function drawCurve(shapes: Shape[], canvas: HTMLCanvasElement) {
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

function drawHistogram(canvas: HTMLCanvasElement, histogram: number[], min: number, max: number, threshold: number) {
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

function advanceScreeningState(nextState: ScreeningState, prevState: ScreeningState, currentCount: number): { state: ScreeningState, count: number } {
    // We can only move from certain states to certain other states.
    if (prevState !== nextState) {
        const allowedNextState = ScreeningAcceptanceStates[prevState];
        if ((allowedNextState as ScreeningState[]).includes(nextState)) {
            // console.log("Advanced to state", nextState);
            return {
                state: nextState,
                count: 1
            }
        }
    }
    return {
        state: prevState,
        count: currentCount + 1
    }
}

(async function main() {
    const frameBuffer = new ArrayBuffer(160 * 120 * 2);
    const dropZone = document.getElementById('drop') as HTMLDivElement;
    // Setup drop zone
    dropZone.addEventListener('drop', async (event: DragEvent) => {
        event.preventDefault();
        if (event.dataTransfer && event.dataTransfer.items) {
            (document.getElementById("instructions") as HTMLParagraphElement).style.display = 'none';
            for (let i = 0; i < event.dataTransfer.items.length; i++) {
                if (event.dataTransfer.items[i].kind === 'file') {
                    let file = event.dataTransfer.items[i].getAsFile() as File;
                    const buffer = await file.arrayBuffer();
                    await renderFile(buffer, frameBuffer);
                }
            }
        }
    });

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    await cptvPlayer.default();
    await smooth.default();
    await curveFit.default();
    smooth.initialize(120, 160);
    // const files = [
    //     // "/cptv-files/20200716.153101.633.cptv",
    //     // "/cptv-files/20200716.153342.441.cptv",
    //     // "/cptv-files/20200718.130017.220.cptv",
    //     // "/cptv-files/20200718.130059.393.cptv",
    //     // "/cptv-files/20200718.130508.586.cptv", // s
    //     // "/cptv-files/20200718.130536.950.cptv", // s
    //     // "/cptv-files/20200718.130606.382.cptv", // s
    //     // "/cptv-files/20200718.130624.941.cptv", //s
    //     //"/cptv-files/20200729.104543.646.cptv",
    //     //"/cptv-files/20200729.104622.519.cptv",
    //      //"/cptv-files/20200729.104815.556.cptv",
    //
    //     //"/cptv-files/20200729.105038.847.cptv",
    //     // "/cptv-files/20200729.105022.389.cptv",
    //     // "/cptv-files/20200729.104543.646.cptv",
    //     // "/cptv-files/20200729.105053.858.cptv"
    // ];
    // const files: string[] = [
    //     //"/cptv-files/bunch of people downstairs 20200812.160746.324.cptv",
    //     //"/cptv-files/bunch of people downstairs walking towards camera 20200812.161144.768.cptv"
    //     "/cptv-files/bunch of people in small meeting room 20200812.134427.735.cptv",
    //     //"/cptv-files/20200716.153101.633.cptv",
    //     //"/cptv-files/20200718.130508.586.cptv" - still bad
    //     //"/cptv-files/20200718.130536.950.cptv"
    // ];
    const files: string[] = [];
    if (files.length) {
        const dropZone = document.getElementById("drop");
        if (dropZone) {
            (dropZone.parentElement as HTMLElement).removeChild(dropZone);
        }
    }
    for (const file of files) {
        const cptvFile = await fetch(file);
        const buffer = await cptvFile.arrayBuffer();
        await renderFile(buffer, frameBuffer);
    }
}());

/*
(async function m() {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 160;
    document.body.appendChild(canvas);
    const dropZone = document.getElementById('drop') as HTMLDivElement;
    dropZone.parentElement.removeChild(dropZone);
    const points = [
        {x: 10, y: 10},
        {x: 20, y: 10},
        {x: 50, y: 20},
        {x: 50, y: 60},
        {x: 14, y: 30},
        {x: 13, y: 5},
        {x: 13, y: 0},
        {x: 70, y: 10},
    ];

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = 'red';
    for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1,0, Math.PI * 2);
        ctx.fill();
    }
    const line = directionOfSet(points);
    ctx.strokeStyle = 'blue';
    ctx.beginPath();
    console.log(line);
    ctx.moveTo(0, line.y);
    const vec = add({x: 0, y: line.y}, scale(normalise({x: 1, y: line.x}), 150));
    ctx.lineTo(vec.x, vec.y);
    //ctx.arc(line.x, line.y, 1,0, Math.PI * 2);
    ctx.stroke();

}())
 */

function shapesOverlap(a: RawShape, b: RawShape): boolean {
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

async function renderFile(buffer: ArrayBuffer, frameBuffer: ArrayBuffer) {
    const dropZone = document.getElementById("drop");
    if (dropZone) {
        (dropZone.parentElement as HTMLElement).removeChild(dropZone);
    }
    cptvPlayer.initWithCptvData(new Uint8Array(buffer));

    const toggleOpacity = (item: Element) => {
        if (item.classList.contains('off')) {
            item.classList.remove('off');
            item.classList.add('on');
        } else {
            item.classList.add('off');
            item.classList.remove('on');
        }
    };

    const toggleActive = (item: Element) => {
        if (item.classList.contains('active')) {
            item.classList.remove('active');
        } else {
            item.classList.add('active');
        }
    }

    (document.getElementById("toggle-bg") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.bg2').forEach(toggleOpacity);
    });
    (document.getElementById("toggle-motion") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.bg').forEach(toggleOpacity);
    });
    (document.getElementById("toggle-threshold") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.threshold').forEach(toggleOpacity);
    });
    (document.getElementById("toggle-edges") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.edge').forEach(toggleOpacity);
    });
    (document.getElementById("toggle-analysis") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.analysis').forEach(toggleOpacity);
    });

    let frameNumber = -1;
    const seenFrames = new Set();
    let thermalReference = null;

    let screeningState = ScreeningState.READY;
    let screeningStateCount = 0;
    let prevFace = null;
    let startTime = 0;
    let seenBody = false;
    const refImages: Record<number, Float32Array> = {};

    let prevFrame = null;
    let prevMotion: MotionStats = {
        edge: 0,
        hotInner: 0,
        hotInnerEdge: 0,
        motion: 0,
        motionPlusThreshold: 0,
        actionInBottomHalf: 0,
        thresholded: 0
    };
    while (!seenFrames.has(frameNumber)) {
        seenFrames.add(frameNumber);
        const frameInfo = cptvPlayer.getRawFrame(new Uint8Array(frameBuffer));
        frameNumber = frameInfo.frame_number;

        // if (frameNumber !== 172 && frameNumber !== 173) {
        //     continue;
        // }

        // if (frameNumber < 2102 || frameNumber > 2106) {
        //     continue;
        // }
        // if (frameNumber < 1017 || frameNumber > 1020) {
        //     continue;
        // }

        // if (frameNumber < 247 || frameNumber > 251) {
        //     continue;
        // }

        // if (frameNumber < 0 || frameNumber > 73) {
        //     continue;
        // }
        // if (frameNumber < 66 || frameNumber > 67) {
        //     continue;
        // }



        // if (frameNumber !== 313 && frameNumber !== 314) {
        //     continue;
        // }

        // TODO(jon): Should really rotate the 16bit array
        const fr = new Float32Array(new Uint16Array(frameBuffer))
        const frame = rotate90(fr, new Float32Array(fr.length));

        // Now do smoothing...
        smooth.smooth(frame, 16);
        const thresholded = smooth.getThresholded();
        const radialSmoothed = new Float32Array(smooth.getRadialSmoothed());
        refImages[frameNumber] = radialSmoothed;
        const medianSmoothed = smooth.getMedianSmoothed();
        const {min, max, threshold} = smooth.getHeatStats();
        const histogram = smooth.getHistogram();
        // If there's not enough weight above the threshold, move down until there is.

        // TODO(jon):

        thermalReference = detectThermalReference(
            medianSmoothed,
            radialSmoothed,
            null,
            120,
            160
        );

        // Now we'd like to do edge detection around the thermal ref to try and find the box and exclude it.
        // We know the approx dimensions of the thermal ref box, just need to work out orientation etc.

        let stats;
        let thermalRefRaw = 0;
        let thermalRefC = 38;
        if (thermalReference) {
            stats = extractSensorValueForCircle(thermalReference, medianSmoothed, 120);
            thermalRefRaw = stats.median;
        }

        // NOTE(jon): When we join and fill shapes, we want to keep a version that is just the thresholded version,
        //  for determining where to sample from.

        //const convexShapes = shapes.map(convexHullForShape);
        //if (shapes.length) {
        // console.log('# ', frameNumber);

        const div = document.createElement("div");
        div.className = "c-container";
        const text = document.createElement("p");

        const analysisCanvas = document.createElement("canvas");
        analysisCanvas.id = `f-${frameInfo.frame_number}`;
        analysisCanvas.className = 'analysis';
        analysisCanvas.width = WIDTH;
        analysisCanvas.height = HEIGHT;
        const ctx = analysisCanvas.getContext('2d') as CanvasRenderingContext2D;
        const currentFrameNumber = frameNumber;
        analysisCanvas.addEventListener('mousemove', (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const x = Math.floor(Math.min(e.clientX - rect.x, 119));
            const y = Math.floor(Math.min(e.clientY - rect.y, 159));
            const index = y * 120 + x;
            const val = refImages[currentFrameNumber][index];
            // TODO(jon): Double, and triple check this temperature calculation!
            const temp = thermalRefC + (val - thermalRefRaw) * 0.01;
            text.innerHTML = `(${x}, ${y}), ${temp.toFixed(2)}C&deg;<br>${~~val}::${~~thermalRefRaw} - #${currentFrameNumber}`;
        });
        analysisCanvas.addEventListener('mouseleave', (e) => {
            text.innerHTML = "";
        });

        const motionCanvas = document.createElement("canvas");
        motionCanvas.className = 'bg';
        motionCanvas.width = WIDTH;
        motionCanvas.height = HEIGHT;

        const backgroundCanvas = document.createElement("canvas");
        backgroundCanvas.className = 'bg2';
        backgroundCanvas.width = WIDTH;
        backgroundCanvas.height = HEIGHT;

        const sobelCanvas = document.createElement("canvas");
        sobelCanvas.className = 'edge';
        sobelCanvas.width = WIDTH;
        sobelCanvas.height = HEIGHT;

        const thresholdCanvas = document.createElement("canvas");
        thresholdCanvas.className = 'threshold';
        thresholdCanvas.width = WIDTH;
        thresholdCanvas.height = HEIGHT;

        const hist = document.createElement("canvas");
        hist.className = "histogram";
        hist.width = WIDTH;
        hist.height = 30;

        // IDEA(jon): We can avoid smoothing altogether, and just smooth when we actually take a sample, when it's really cheap.

        // TODO(jon): Just calculate the edges
        let sobel = edgeDetect(medianSmoothed, 120, 160);

        let sMin = Number.MAX_SAFE_INTEGER;
        let sMax = 0;
        for (let i = 0; i < sobel.length; i++) {
            sMin = Math.min(sMin, sobel[i]);
            sMax = Math.max(sMax, sobel[i]);
        }
        // Now take only the edges over a certain intensity?



        //console.log(sMin, sMax);
        let {m, mx, motionMask} =  subtractFrame(radialSmoothed, prevFrame, motionBit);
        prevFrame = new Float32Array(radialSmoothed);
        if (m === -1) {
            m = min;
        }
        if (mx === -1) {
            mx = max;
        }
        const rng = mx - m;
        if (rng < 50) {
            m = min;
            mx = max;
        }
        drawImage2(backgroundCanvas, frame, min, max);
        //drawImage2(sobelCanvas, sobel, sMin, sMax);
        //drawImage(motionCanvas, im, 0xff00ff00);

        //let th = new Uint8Array(120 * 160);
        // Adjust threshold down if higher than the max of 34degrees
        let adjustedThreshold = threshold;
        if (thermalReference) {
            const thresholdTemp = (thermalRefC + ((threshold - thermalRefRaw) * 0.01));
            if (thresholdTemp > 33) {
                // Make the threshold be 34
                //thermalRefC - (34 +
                //adjustedThreshold = ((thermalRefRaw / 38) * 34) / 0.01;
                //return GThermalRefTemp + (val - UncorrectedThermalRef) * 0.01;

                // 34 = (38 + ((t - b) * 0.01))
                adjustedThreshold = thermalRefRaw - 500;

                // FIXME(jon) Make sure there is enough pixels above the threshold, using the histogram:

                //console.log(adjustedThreshold, thermalRefRaw);
            }
        }

        // Remove motion mask bits for motion lines that don't abut thresholds bits
        // for (let y = 0; y < 120; y++) {
        //     for (let x = 0; x < 160; x++) {
        //         const i = y * 120 + x;
        //         const v = motionMask[i];
        //
        //     }
        // }

        // for (let i = 0; i < frame.length; i++) {
        //     if (radialSmoothed[i] > adjustedThreshold) {
        //        motionMask[i] |= thresholdBit;
        //     }
        // }

        // Only apply the threshold bit where the thresholded row contains some motion, if the thresholded row spans the full frame width.
        for (let y = 0; y < 160; y++) {
            let thresholdSpansWholeRow = true;
            let hasMotion = false;
            for (let x = 0; x < 120; x++) {
                const i = y * 120 + x;
                if (!hasMotion && motionMask[i] & motionBit) {
                    hasMotion = true;
                    if (!thresholdSpansWholeRow) {
                        break;
                    }
                }
                if (medianSmoothed[i] <= adjustedThreshold) {
                    thresholdSpansWholeRow = false;
                    if (hasMotion) {
                        break;
                    }
                }
            }
            if ((thresholdSpansWholeRow && hasMotion) || !thresholdSpansWholeRow) {
                for (let x = 0; x < 120; x++) {
                    const i = y * 120 + x;
                    if (medianSmoothed[i] > adjustedThreshold) {
                        motionMask[i] |= thresholdBit;
                    }
                }
            }
        }

        const thermalRefWidth = 120 - 95;
        // Remove known thermal ref from mask (make this a factory calibration step)
        for (let y = 99; y < 160; y++) {
            for (let x = 91; x < 120; x++) {
                const i = y * 120 + x;
                motionMask[i] = 0;
            }
        }

        let motionShapes = getRawShapes(motionMask, 120, 160, motionBit);
        let thresholdShapes = getRawShapes(motionMask, 120, 160, thresholdBit);

        let filteredMotion = new Set();
        let filteredThreshold = new Set();
        for (const motionShape of motionShapes) {
            for (const thresholdShape of thresholdShapes) {
                if (shapesOverlap(motionShape, thresholdShape)) {

                    // Make sure the areas are not long thin horizontal boxes taking up the full frame width,
                    const motionShapeArea = rawShapeArea(motionShape);
                    const motionShapeBounds = boundsForRawShape(motionShape);
                    const motionBoundsFilled = (motionShapeBounds.x1 - motionShapeBounds.x0) * (motionShapeBounds.y1 + 1 - motionShapeBounds.y0);
                    if (motionShapeArea / motionBoundsFilled > 0.98 && motionShapeBounds.x0 === 0 && motionShapeBounds.x1 === 120) {
                        continue;
                    }
                    const thresholdShapeArea = rawShapeArea(thresholdShape);
                    const thresholdShapeBounds = boundsForRawShape(thresholdShape);
                    const thresholdBoundsFilled = (thresholdShapeBounds.x1 - thresholdShapeBounds.x0) * (thresholdShapeBounds.y1 + 1 - thresholdShapeBounds.y0);
                    if (thresholdShapeArea / thresholdBoundsFilled > 0.98 && thresholdShapeBounds.x0 === 0 && thresholdShapeBounds.x1 === 120) {
                        continue;
                    }
                    if (thresholdShapeArea > 300) {
                        // At least one of the shapes should pass a size threshold:
                        filteredMotion.add(motionShape);
                        filteredThreshold.add(thresholdShape);
                    }
                }
            }
        }
        // If there's no motion in the bottom half of the frame, but there is plenty of threshold, just add the threshold?
        if (filteredMotion.size === 0 && filteredThreshold.size === 0) {
            for (const thresholdShape of thresholdShapes) {
                const thresholdShapeArea = rawShapeArea(thresholdShape);
                const thresholdShapeBounds = boundsForRawShape(thresholdShape);
                const thresholdBoundsFilled = (thresholdShapeBounds.x1 - thresholdShapeBounds.x0) * (thresholdShapeBounds.y1 + 1 - thresholdShapeBounds.y0);
                if (thresholdShapeArea / thresholdBoundsFilled > 0.98 && thresholdShapeBounds.x0 === 0 && thresholdShapeBounds.x1 === 120) {
                    continue;
                }
                if (thresholdShapeArea > 300 && !thresholdShape[0] && thresholdShapeBounds.x1 - thresholdShapeBounds.x0 < 120 - thermalRefWidth) {
                    // At least one of the shapes should pass a size threshold:
                    filteredThreshold.add(thresholdShape);
                }
            }
        }

        // Draw the filtered mask back into a canvas?
        const newMask = new Uint8Array(160 * 120);
        drawRawShapesIntoMask(Array.from(filteredMotion) as RawShape[], newMask, motionBit);
        //drawRawShapesIntoMask(Array.from(filteredThreshold) as RawShape[], newMask, thresholdBit);
        const solidThresholds = getSolidShapes(Array.from(filteredThreshold) as RawShape[]);
        drawShapesIntoMask(solidThresholds, newMask, thresholdBit);
        let mSum = 0;
        let mPlusTSum = 0;
        let tSum = 0;
        let actionInBottomOfFrame  = 0;
        for (let y = 0; y < 160; y++) {
            for (let x = 0; x < 120; x++) {
                const i = y * 120 + x;
                const v = newMask[i];

                if (sobel[i] !== 0) {
                    newMask[i] |= edgeBit;
                }

                if (v & motionBit) {
                    mSum++;
                }
                if (v & thresholdBit) {
                    tSum++;
                }
                if (v & motionBit && v & thresholdBit) {
                    mPlusTSum++;
                }
                if (y > 80 && v !== 0) {
                    actionInBottomOfFrame++;
                }
            }
        }

        // Remove known thermal ref from mask (make this a factory calibration step)
        for (let y = 99; y < 160; y++) {
            for (let x = 91; x < 120; x++) {
                const i = y * 120 + x;
                newMask[i] = 0;
            }
        }

        // Remove motion shapes that don't overlap a threshold.
        // Remove threshold shapes that don't overlap some motion shape.

        drawRawShapes(Array.from(filteredMotion) as RawShape[], frameNumber, motionCanvas);
        //drawRawShapes(Array.from(filteredThreshold) as RawShape[], frameNumber, thresholdCanvas, 0x3300ffff);
        drawShapes(solidThresholds, frameNumber, thresholdCanvas, 0x3300ffff);

        const data = newMask;
        const th2 = new Uint8Array(120*160);
        let motionSum = 0;
        let yellowSum = 0;
        let lRedSum = 0;
        let redSum = 0;
        for (let y = 0; y < 160; y++) {
            let prev = 0;
            let opened = false;
            let insideMotion = false;
            let lineHasMotion = false;
            for (let x = 0; x < 120; x++) {
                const i = y * 120 + x;
                const v = data[i];
                if (prev === motionBit && !(v & motionBit)) {
                    insideMotion = true;
                }
                else if (insideMotion && v === motionBit) {
                    insideMotion = false;
                }
                if (v & motionBit && v && thresholdBit && v & edgeBit && prev === motionBit) {
                    if (!allNeighboursEqual(x, y, data, motionBit)) {
                        opened = true;
                        yellowSum++;
                    }

                }
                else if (v & motionBit && v & thresholdBit && prev === motionBit) {
                    if (!allNeighboursEqual(x, y, data, motionBit)) {
                        opened = true;
                        yellowSum++;
                    }

                }
                else if (v & motionBit && v && thresholdBit && v & edgeBit) {
                    redSum++;
                    //th2[i] = 255;
                } else if (v & motionBit && v & thresholdBit) {
                    lRedSum++;
                    //th2[i] = 255;
                } else if (v & motionBit && v & edgeBit) {
                    // Never happens
                    //image[i] = 0xff00ff00;
                } else if (v & thresholdBit && v & edgeBit) {
                    //image[i] = 0xffffffff;
                } else if (v & motionBit) {
                    if (opened) {
                        if (prev & motionBit && prev && thresholdBit && prev & edgeBit) {
                            if (!allNeighboursEqual(x - 1, y, data, motionBit)) {
                                yellowSum++
                            }
                        } else if (prev & motionBit && prev & thresholdBit) {
                            if (!allNeighboursEqual(x - 1, y, data, motionBit)) {
                                yellowSum++
                            }
                        }
                        //opened = false;
                    }
                    motionSum++;
                    lineHasMotion = true;
                }
                prev = v;
            }
            prev = 0;
            opened = false;
            insideMotion = false;
            for (let x = 0; x < 120; x++) {
                const i = y * 120 + x;
                const v = data[i];

                if (prev === motionBit && !(v & motionBit)) {
                    insideMotion = true;
                }
                else if (insideMotion && v === motionBit) {
                    insideMotion = false;
                }

                if (v & motionBit && v && thresholdBit && v & edgeBit && prev === motionBit) {
                }
                else if (v & motionBit && v & thresholdBit && prev === motionBit) {
                }
                else if (v & motionBit && v && thresholdBit && v & edgeBit) {
                    th2[i] = 255;
                } else if (v & motionBit && v & thresholdBit) {
                    th2[i] = 255;
                } else if (v & motionBit && v & edgeBit) {
                    // Never happens
                } else if (v & thresholdBit && v & edgeBit) {
                } else if (v & motionBit) { // No threshold bit set
                } else if (v & thresholdBit && lineHasMotion && insideMotion) {
                    // FIXME(jon): inside motion should not need to be opened or closed so long as the thresholded region doesn't
                    // go to the edge of the frame
                    th2[i] = 255; // green
                }
                prev = v;
            }
        }

        const rawShapes = getRawShapes(th2, 120, 160);
        const {shapes, didMerge: maybeHasGlasses} = preprocessShapes(rawShapes, frameNumber, thermalReference);
        drawImage(sobelCanvas, analysisCanvas, newMask, frameNumber);
        drawHistogram(hist, histogram, min, max, adjustedThreshold);

        const textState = document.createElement("div");
        textState.className = "text-state";

        div.appendChild(backgroundCanvas);
        div.appendChild(motionCanvas);
        div.appendChild(thresholdCanvas);
        div.appendChild(sobelCanvas);
        div.appendChild(analysisCanvas);
        div.appendChild(hist);
        div.appendChild(text);
        div.appendChild(textState);
        document.body.appendChild(div);

        // TODO(jon) add the enter/scan/leave events annotated.
        //  Make this into a drag and drop web interface, so others can test videos
        //  Factor out shared modules.


        // TODO(jon): If we have a big blob, but no torso reaching the bottom of the frame, could try
        //  walking back up the histogram to earlier peaks?  Else to head detection from the top.

        //const body = extendToBottom(largestShape(shapes));
        let face = null;
        let body = null;
        if (shapes.length) {
            body = largestShape(shapes);
            //drawShapes([body], frameInfo.frame_number, analysisCanvas);
            if (body[body.length - 1].y < 159) {
               // body = extendToBottom(body);
            }
            // TODO(jon): Fill gaps?
            // Thresholded
            // drawShapes([body], frameInfo.frame_number, analysisCanvas);
            //face = extractFaceInfo(extendToBottom(body), radialSmoothed, analysisCanvas, maybeHasGlasses);

            if (face) {
                /*
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'red';
                ctx.beginPath();
                ctx.moveTo(face.head.leftNeckSpan.x0, face.head.leftNeckSpan.y);
                ctx.lineTo(face.head.rightNeckSpan.x1, face.head.rightNeckSpan.y);
                ctx.stroke();
                 */
            }
        }

        if (seenBody) {
            startTime += (1000 / 8.7);
        }
        if (body) {
            seenBody = true;
        }

        if (body) {
            const torsoPoints = [];
            let hulledTorso: Point[] = [];
            let outline: Point[] = [];
            if (!face) {
                // TODO(jon): Can we do a better job generating faces here, even if we only have a neck?
                //  Really just for our outlining.
                for (let i = 0; i < body.length; i++) {
                    torsoPoints.push({x: body[i].x0, y: body[i].y});
                }
                for (let i = 0; i < body.length; i++) {
                    torsoPoints.push({x: body[i].x1, y: body[i].y});
                }
                hulledTorso = convexHull(torsoPoints);
                for (const p of hulledTorso) {
                    outline.push(p);
                }
            }
            else { // face and body
                if (faceArea(face) > 1500 && !faceIntersectsThermalRef(face, thermalReference)) {
                    //drawFace(face, canvas, threshold, radialSmoothed);
                } else {
                    // TODO(jon): draw tracking oval of some kind.
                }


                // Now get the neck left and right points, and create convex hulls of each side of the face.
                const neckLeft = face.head.leftNeckSpan;
                const neckRight = face.head.rightNeckSpan;
                //const yCut = Math.round(Math.max(neckLeft.y, neckRight.y));
                const cutIndexLeft = body.findIndex(span => span.y === neckLeft.y && span.x0 === neckLeft.x0);
                const cutIndexRight = body.findIndex(span => span.y === neckRight.y && span.x1 === neckRight.x1);
                const headPoints = []; // All the left points above neckLeft, then all the right points above neckRight
                for (let i = cutIndexLeft; i >= 0; i--) {
                    headPoints.push({x: body[i].x0, y: body[i].y});
                }
                for (let i = 0; i <= cutIndexRight; i++) {
                    headPoints.push({x: body[i].x1, y: body[i].y});
                }
                const hulledHead = convexHull(convexHull(headPoints));
                hulledHead.pop();
                //console.log(hulledHead);
                for (let i = cutIndexLeft; i < body.length; i++) {
                    torsoPoints.push({x: body[i].x0, y: body[i].y});
                }
                for (let i = cutIndexRight; i < body.length; i++) {
                    torsoPoints.push({x: body[i].x1, y: body[i].y});
                }
                hulledTorso = convexHull(convexHull(torsoPoints));
                // This is just for creating the outline:


                // Find the bottomLeft and bottomRight points of the hulledHead
                const headBounds = boundsForConvexHull(hulledHead);
                const left = closestPoint({x: headBounds.x0, y: headBounds.y1}, hulledHead);
                const right = closestPoint({x: headBounds.x1, y: headBounds.y1}, hulledHead);
                // drawPoint(left, analysisCanvas);
                // drawPoint(right, analysisCanvas);
                const startIndexHead = hulledHead.indexOf(left);//, hulledHead.indexOf(right));
                const endIndexHead = hulledHead.indexOf(right);
                //const torsoLeft = closestPoint(left, hulledTorso);
                const torsoRight = closestPoint(right, hulledTorso);
                const startIndexTorso = hulledTorso.indexOf(torsoRight);
                for (let i = 0; i < endIndexHead; i++) {
                    if (!outline.find(pt => pt.x == hulledHead[i].x && pt.y == hulledHead[i].y)) {
                        outline.push(hulledHead[i]);
                    }
                }
                for (let i = startIndexTorso; i < hulledTorso.length; i++) {
                    if (!outline.find(pt => pt.x == hulledTorso[i].x && pt.y == hulledTorso[i].y)) {
                        outline.push(hulledTorso[i]);
                    }
                }
                for (let i = 0; i < startIndexTorso; i++) {
                    if (!outline.find(pt => pt.x == hulledTorso[i].x && pt.y == hulledTorso[i].y)) {
                        outline.push(hulledTorso[i]);
                    }
                }
                for (let i = startIndexHead; i < hulledHead.length; i++) {
                    if (!outline.find(pt => pt.x == hulledHead[i].x && pt.y == hulledHead[i].y)) {
                        outline.push(hulledHead[i]);
                    }
                }
                //drawCurve(shapes, canvas);
                //drawShapes(shapes, frameInfo.frame_number, canvas);

                //drawCurveFromPoints(pointsArray, canvas);
                //drawPoint(p, canvas);
            }
            //drawConvexShape(outline, frameInfo.frame_number, canvas);

            // TODO(jon): Rasterize these points, so we get better curve fitting?
            //  Another idea is just to subdivide the lines a few times?
            // for (let i = 0; i < 5; i++) {
            //     outline = subdivideOutline(outline);
            // }

            // TODO(jon): Get rid of outline corners
            // Get the bottom left of the outline, use that as the start point,
            // then travel around counter-clockwise until we reach the bottom again,
            // or the side.
            let startOutlineIndex = outline.indexOf(closestPoint({x: 0, y: 160}, outline));
            let endOutlineIndex = outline.indexOf(closestPoint({x: 120, y: 160}, outline));
            let n = [];
            for (let i = startOutlineIndex; i < outline.length; i++) {
                n.push(outline[i]);
            }
            for (let i = 0; i <= endOutlineIndex; i++) {
                n.push(outline[i]);
            }
            outline = n;

            const pointsArray = new Uint8Array(outline.length * 2);
            let ptr = 0;
            for (const point of outline) {
                pointsArray[ptr++] = point.x;
                pointsArray[ptr++] = point.y;
            }
            //drawCurveFromPoints(pointsArray, canvas);
        }

        const prevState = screeningState;

        const motionStats: MotionStats = {
            edge: yellowSum,
            hotInner: lRedSum,
            hotInnerEdge: redSum,
            motion: mSum,
            thresholded: tSum,
            motionPlusThreshold: mPlusTSum,
            actionInBottomHalf: actionInBottomOfFrame
        }
        const allMotion = motionStats.motion + motionStats.hotInnerEdge + motionStats.hotInner + motionStats.edge;
        const advanced = advanceState(prevMotion, motionStats, face, body, prevFace, screeningState, screeningStateCount, threshold, radialSmoothed, thermalReference);

        prevMotion = motionStats;

        if (advanced.state === ScreeningState.LEAVING) {
            seenBody = false;
        }
        prevFace = advanced.prevFace;
        screeningState = advanced.state;
        screeningStateCount = advanced.count;
        if (advanced.state !== prevState) {
            if (div.classList.contains(prevState)) {
                div.classList.replace(prevState, advanced.state);
            } else {
                div.classList.add(advanced.state);
            }
        }  else {
            div.classList.add(advanced.state);
        }
        if (thermalReference) {
            //console.log((thermalReference.x1 - thermalReference.x0) * 0.5);
            const ctx = analysisCanvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(thermalReference.midX(), thermalReference.midY(), (thermalReference.x1 - thermalReference.x0) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        //<br>${seenBody && advanced.event ? `${(startTime/ 1000).toFixed(2)}s elapsed` : ''}<br>${advanced.event}<br>

        textState.innerHTML = `#${frameNumber}, ${screeningState}(${screeningStateCount})
Threshold ${(thermalRefC + (adjustedThreshold - thermalRefRaw) * 0.01).toFixed(2)}C&deg;
<br>Motion: ${mSum}<br>Threshold: ${tSum}<br>Both: ${mPlusTSum}<br>Bottom: ${actionInBottomOfFrame}`;
`
//<br>Motion: ${motionSum}<br>Red: ${redSum}<br>lRed: ${lRedSum}<br>Yellow: ${yellowSum}<br>ALL: ${allMotion}<br>LastFFC: ${((frameInfo.time_on - frameInfo.last_ffc_time) / 1000).toFixed(2)}s ago<br>Body: ${body && shapeArea(body)}`; //  ${face?.halfwayRatio}
        // Write the screening state out to a text block.
    }
}

function subdivideOutline(outline: Point[]): Point[] {
    let prev = outline[0];
    const newOutline = [prev];
    for (let i = 1; i < outline.length; i++) {
        let next = outline[i];
        let v = add(prev, scale(normalise(sub(next, prev)), 0.5));
        if (!isNaN(v.x) && !isNaN(v.y)) {
            newOutline.push(v);
        }
        if (!newOutline.find(pt => {
            pt.x == next.x && pt.y == next.y
        })) {
            newOutline.push(next);
        }
        prev = next;
    }
    return newOutline;
}

function faceIntersectsThermalRef(face: FaceInfo, thermalReference: ROIFeature | null): boolean {
    if (thermalReference === null) {
        return false;
    }
    const quad = {topLeft: face.head.topLeft, topRight: face.head.topRight, bottomLeft: face.head.bottomLeft, bottomRight: face.head.bottomRight };
    return (
        pointIsInQuad({x: thermalReference.x0, y: thermalReference.y0}, quad) ||
        pointIsInQuad({x: thermalReference.x0, y: thermalReference.y1}, quad) ||
        pointIsInQuad({x: thermalReference.x1, y: thermalReference.y0}, quad) ||
        pointIsInQuad({x: thermalReference.x1, y: thermalReference.y1}, quad)
    );
}
interface MotionStats {
    motion: number;
    edge: number;
    hotInner: number;
    hotInnerEdge: number;
    thresholded: number;
    motionPlusThreshold: number;
    actionInBottomHalf: number;
}
function advanceState(prevMotionStats: MotionStats, motionStats: MotionStats, face: FaceInfo | null, body: Shape | null, prevFace: FaceInfo | null,  screeningState: ScreeningState, screeningStateCount: number, threshold: number, radialSmoothed: Float32Array, thermalReference: ROIFeature | null): {prevFace: FaceInfo | null, state: ScreeningState, count: number, event: string} {
    let next;
    let event = "";
    const prevAllMotion = prevMotionStats.motion + prevMotionStats.hotInnerEdge + prevMotionStats.hotInner + prevMotionStats.edge;
    const allMotion = motionStats.motion + motionStats.hotInnerEdge + motionStats.hotInner + motionStats.edge;
    if (thermalReference === null) {
        next = advanceScreeningState(ScreeningState.MISSING_THERMAL_REF, screeningState, screeningStateCount);
    }
    else if (face !== null) {
        if (screeningState === ScreeningState.MISSING_THERMAL_REF) {
            if (faceArea(face) < 1500) {
                next = advanceScreeningState(ScreeningState.TOO_FAR, screeningState, screeningStateCount);
            } else {
                next = advanceScreeningState(ScreeningState.LARGE_BODY, screeningState, screeningStateCount);
            }
        }
        else if (faceArea(face) < 1500) {
            next = advanceScreeningState(ScreeningState.TOO_FAR, screeningState, screeningStateCount);
        }
        else if (faceIntersectsThermalRef(face, thermalReference)) {
            next = advanceScreeningState(ScreeningState.LARGE_BODY, screeningState, screeningStateCount);
        }
        else if (face.headLock !== 0) {
            const temperatureSamplePoint = getHottestSpotInBounds(
                face,
                threshold,
                120,
                160,
                radialSmoothed
            );
            if (
                faceIsFrontOn(face)
                // &&
                // samplePointIsInsideCroppingArea({
                //     x: temperatureSamplePoint.x,
                //     y: temperatureSamplePoint.y
                // })
            ) {
                const faceMoved = faceHasMovedOrChangedInSize(face, prevFace);
                if (faceMoved) {
                    screeningStateCount--;
                }
                if (
                    screeningState === ScreeningState.FRONTAL_LOCK &&
                    !faceMoved &&
                    face.headLock === 1 &&
                    screeningStateCount > 2 // Needs to be on this state for at least two frames.
                ) {
                    next = advanceScreeningState(ScreeningState.STABLE_LOCK, screeningState, screeningStateCount);
                    if (next.state !== screeningState) {
                        // Capture the screening event here
                        event = "Captured";
                    }
                } else if (screeningState === ScreeningState.STABLE_LOCK) {
                    next = advanceScreeningState(ScreeningState.LEAVING, screeningState, screeningStateCount);
                } else {
                    next = advanceScreeningState(ScreeningState.FRONTAL_LOCK, screeningState, screeningStateCount);
                }
            } else {
                // NOTE: Could stay here a while if we're in an FFC event.
                next = advanceScreeningState(ScreeningState.FACE_LOCK, screeningState, screeningStateCount);
            }
        } else {
            next = advanceScreeningState(ScreeningState.HEAD_LOCK, screeningState, screeningStateCount);
        }
        // TODO(jon): Hybrid approach with haar cascade where we can detect multiple heads?
        // } else {
        //   this.advanceScreeningState(ScreeningState.MULTIPLE_HEADS);
        // }
        prevFace = face;
    } else {

        // TODO(jon): Ignore stats around FFC, just say that it's thinking...

        const hasBody = motionStats.actionInBottomHalf && (motionStats.motionPlusThreshold > 10 || motionStats.actionInBottomHalf > 500);
        const prevFrameHasBody = prevMotionStats.actionInBottomHalf && (prevMotionStats.motionPlusThreshold > 10 || prevMotionStats.actionInBottomHalf > 500);
        // TODO(jon): OR the threshold bounds are taller vertically than horizontally?
        if (hasBody) {
            next = advanceScreeningState(ScreeningState.LARGE_BODY, screeningState, screeningStateCount);
        }
        else {
            // Require 2 frames without a body before triggering leave event.
            if (!prevFrameHasBody) {
                if (screeningState === ScreeningState.LEAVING) {
                    // Record event now that we have lost the face?
                    event = "Recorded";
                }
                next = advanceScreeningState(ScreeningState.READY, screeningState, screeningStateCount);
            } else {
                next = advanceScreeningState(ScreeningState.LARGE_BODY, screeningState, screeningStateCount);
            }
        }
        prevFace = null;
    }
    return {
        prevFace,
        state: next.state,
        count: next.count,
        event
    };
}

function faceIsFrontOn(face: FaceInfo): boolean {
    // Face should be full inside frame, or at least forehead should be.
    // Face should be front-on symmetry wise
    return face.headLock !== 0;
}

function faceArea(face: FaceInfo): number {

    // TODO(jon): Could give actual pixel area of face too?
    const width = distance(face.horizontal.left, face.horizontal.right);
    const height = distance(face.vertical.top, face.vertical.bottom);
    return width * height;
}

function faceHasMovedOrChangedInSize(face: FaceInfo, prevFace: FaceInfo | null): boolean {
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
    if  (changedArea) {
        console.log('area changed too much');
        return true;
    }
    const dTL = distance(face.head.topLeft, prevFace.head.topLeft);
    const dTR = distance(face.head.topRight, prevFace.head.topRight);
    const dBL = distance(face.head.bottomLeft, prevFace.head.bottomLeft);
    const dBR = distance(face.head.bottomRight, prevFace.head.bottomRight);
    const maxMovement = Math.max(dTL, dTR, dBL, dBR);
    if (maxMovement > 10) {
        console.log('moved too much', maxMovement);
        return true;
    }
    return false;
}
