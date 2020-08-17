function accumulatePixel(
    dest: Float32Array,
    x: number,
    y: number,
    amount: number,
    width: number,
    height: number
) {
    x = ~~x;
    y = ~~y;
    if (x < 0 || y < 0) {
        return;
    }
    if (x >= width || y >= height) {
        return;
    }
    const index = y * width + x;
    dest[index] += amount;
}

function addCircle(
    dest: Float32Array,
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    width: number,
    height: number
) {
    accumulatePixel(dest, cx + radius, cy, amount, width, height);
    accumulatePixel(dest, cx - radius, cy, amount, width, height);
    accumulatePixel(dest, cx, cy + radius, amount, width, height);
    accumulatePixel(dest, cx, cy - radius, amount, width, height);
    let d = 3 - 2 * radius;
    let ix = 1;
    let iy = radius;
    while (ix < iy) {
        //Bresenham
        if (d < 0) {
            d += 4 * ix + 6;
        } else {
            iy = iy - 1;
            d += 4 * (ix - iy) + 10;
        }
        accumulatePixel(dest, cx + ix, cy + iy, amount, width, height);
        accumulatePixel(dest, cx - ix, cy + iy, amount, width, height);
        accumulatePixel(dest, cx + ix, cy - iy, amount, width, height);
        accumulatePixel(dest, cx - ix, cy - iy, amount, width, height);
        accumulatePixel(dest, cx + iy, cy + ix, amount, width, height);
        accumulatePixel(dest, cx - iy, cy + ix, amount, width, height);
        accumulatePixel(dest, cx + iy, cy - ix, amount, width, height);
        accumulatePixel(dest, cx - iy, cy - ix, amount, width, height);
        ix += 1;
    }
}

export function edgeDetect(
    source: Float32Array,
    frameWidth: number,
    frameHeight: number
) {
    const width = frameWidth;
    const height = frameHeight;
    const dest = new Float32Array(width * height);
    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            const index = y * width + x;
            const value =
                source[index] * 4 -
                source[index - 1] -
                source[index + 1] -
                source[index + width] -
                source[index - width];
            dest[index] = Math.max(value - 40, 0);
        }
    }

    return dest;
}

export function circleDetectRadius(
    source: Float32Array,
    dest: Float32Array,
    radius: number,
    width: number,
    height: number,
    wx0: number,
    wy0: number,
    wx1: number,
    wy1: number
): [number, number, number] {
    radius = Math.max(radius, 0.00001);
    for (let i = 0; i < width * height; i++) {
        dest[i] = 0;
    }

    wx0 = Math.max(wx0, 2);
    wy0 = Math.max(wy0, 2);
    wx1 = Math.min(wx1, width - 2);
    wy1 = Math.min(wy1, height - 2);

    for (let y = wy0; y < wy1; y++) {
        for (let x = wx0; x < wx1; x++) {
            const index = y * width + x;
            const value = source[index];
            if (value < 1) {
                continue;
            }
            addCircle(dest, x, y, radius, 1, width, height);
        }
    }
    let result = 0;
    let rx = 0;
    let ry = 0;
    for (let y = wy0; y < wy1; y++) {
        for (let x = wx0; x < wx1; x++) {
            const index = y * width + x;
            if (result < dest[index]) {
                result = dest[index];
                rx = x;
                ry = y;
            }
        }
    }
    return [result / (2 + radius), rx + 1, ry + 1];
}

export function circleDetect(
    source: Float32Array,
    frameWidth: number,
    frameHeight: number
): [number, number, number] {
    const dest = new Float32Array(frameWidth * frameHeight);
    let radius = 3.0;
    let bestRadius = -1;
    let bestValue = 2;
    let bestX = 0;
    let bestY = 0;

    // TODO(jon): We should be able to know what the max radius we're looking for is.
    while (radius < 20) {
        let value = 0;
        let cx = 0;
        let cy = 0;
        [value, cx, cy] = circleDetectRadius(
            source,
            dest,
            radius,
            frameWidth,
            frameHeight,
            2,
            2,
            frameWidth - 2,
            frameHeight - 2
        );
        if (bestValue < value) {
            bestValue = value;
            bestRadius = radius;
            bestX = cx;
            bestY = cy;
        }
        radius = ~~(radius * 1.03 + 1);
    }
    return [bestRadius, bestX, bestY];
}

function pointIsInCircle(
    px: number,
    py: number,
    cx: number,
    cy: number,
    r: number
): boolean {
    const dx = Math.abs(px - cx);
    const dy = Math.abs(py - cy);
    return Math.sqrt(dx * dx + dy * dy) < r;
}

export interface Point {
    x: number;
    y: number;
}

export interface ThermalRefValues {
    coords: Point[];
    mean: number;
    median: number;
    min: number;
    max: number;
    count: number;
}

export function extractSensorValueForCircle(
    r: ROIFeature,
    source: Float32Array,
    width: number
): ThermalRefValues {
    const x0 = Math.floor(r.x0);
    const y0 = Math.floor(r.y0);
    const x1 = Math.ceil(r.x1);
    const y1 = Math.ceil(r.y1);
    const values: number[] = [];
    const centerX = r.x0 + (r.x1 - r.x0) / 2;
    const centerY = r.y0 + (r.y1 - r.y0) / 2;
    const radius = (x1 - x0) / 2;
    const coords = [];
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            if (pointIsInCircle(x + 0.5, y + 0.5, centerX, centerY, radius)) {
                const index = y * width + x;
                coords.push({ x, y });
                values.push(source[index]);
            }
        }
    }
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
        sum += values[i];
    }
    values.sort();
    return {
        coords,
        mean: sum / values.length,
        median: values[Math.floor(values.length / 2)],
        min: values[0],
        max: values[values.length - 1],
        count: values.length
    };
}



const PERF_TEST = false;
let performance = {
    mark: (arg: string): void => {
        return;
    },
    measure: (arg0: string, arg1: string, arg2: string): void => {
        return;
    },
    now: () => {
        return;
    }
};
if (PERF_TEST) {
    performance = window.performance;
}

export const MinFaceAge = 2;
export enum FeatureState {
    LeftEdge,
    RightEdge,
    TopEdge,
    BottomEdge,
    Inside,
    Outside,
    None,
    Top,
    Bottom
}

export function euclDistance(
    x: number,
    y: number,
    x2: number,
    y2: number
): number {
    return Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2));
}

export class Rect {
    constructor(
        public x0: number,
        public x1: number,
        public y0: number,
        public y1: number
    ) {}
}

export class ROIFeature {
  constructor() {
    this.x0 = 0;
    this.y0 = 0;
    this.x1 = 0;
    this.y1 = 0;
    this.mergeCount = 1;
    this.sensorMissing = 0;
    this.sensorValue = 0;
    this.sensorX = 0;
    this.sensorY = 0;
  }

  wholeValues() {
    const roundedRoi = new ROIFeature();
    roundedRoi.x0 = ~~this.x0;
    roundedRoi.x1 = ~~this.x1;
    roundedRoi.y0 = ~~this.y0;
    roundedRoi.y1 = ~~this.y1;
    return roundedRoi;
  }
  extend(value: number, maxWidth: number, maxHeight: number): ROIFeature {
    const roi = new ROIFeature();
    roi.x0 = Math.max(0, this.x0 - value);
    roi.x1 = Math.min(maxWidth, this.x1 + value);
    roi.y0 = Math.max(0, this.y0 - value);
    roi.y1 = Math.min(maxHeight, this.y1 + value);
    return roi;
  }

  wider(other: ROIFeature | null | undefined): boolean {
    return !other || this.width() > other.width();
  }

  higher(other: ROIFeature | null | undefined): boolean {
    return !other || this.height() > other.height();
  }

  hasXValues() {
    return this.x0 != -1 && this.x1 != -1;
  }

  hasYValues() {
    return this.y0 != -1 && this.y1 != -1;
  }

  midX() {
    return (this.x0 + this.x1) / 2;
  }
  midY() {
    return (this.y0 + this.y1) / 2;
  }

  width() {
    return this.x1 - this.x0;
  }

  height() {
    return this.y1 - this.y0;
  }

  midDiff(other: ROIFeature): number {
    return euclDistance(this.midX(), this.midY(), other.midX(), other.midY());
  }

  overlapsROI(other: ROIFeature): boolean {
    return this.overlap(other.x0, other.y0, other.x1, other.y1);
  }

  overlap(x0: number, y0: number, x1: number, y1: number) {
    if (x1 <= this.x0) {
      return false;
    }
    if (y1 <= this.y0) {
      return false;
    }
    if (this.x1 <= x0) {
      return false;
    }
    if (this.y1 <= y0) {
      return false;
    }
    return true;
  }

  contains(x: number, y: number) {
    if (x <= this.x0) {
      return false;
    }
    if (y <= this.y0) {
      return false;
    }
    if (this.x1 < x) {
      return false;
    }
    if (this.y1 < y) {
      return false;
    }
    return true;
  }

  // checks if this roi fits completely inside a sqaure (x0,y0) - (x1,y1)
  isContainedBy(x0: number, y0: number, x1: number, y1: number): boolean {
    if (this.x0 > x0 && this.x1 < x1 && this.y0 > y0 && this.y1 < y1) {
      return true;
    }
    return false;
  }

  tryMerge(x0: number, y0: number, x1: number, y1: number, mergeCount = 1) {
    if (!this.overlap(x0, y0, x1, y1)) {
      return false;
    }
    const newMerge = mergeCount + this.mergeCount;
    this.x0 = (this.x0 * this.mergeCount + x0 * mergeCount) / newMerge;
    this.y0 = (this.y0 * this.mergeCount + y0 * mergeCount) / newMerge;
    this.x1 = (this.x1 * this.mergeCount + x1 * mergeCount) / newMerge;
    this.y1 = (this.y1 * this.mergeCount + y1 * mergeCount) / newMerge;
    this.mergeCount = newMerge;
    return true;
  }

  x0: number;
  y0: number;
  x1: number;
  y1: number;
  mergeCount: number;
  sensorValue: number;
  sensorMissing: number;
  sensorX: number;
  sensorY: number;
}

function circleStillPresent(
    r: ROIFeature,
    saltPepperData: Float32Array,
    edgeData: Float32Array,
    frameWidth: number,
    frameHeight: number
) {
    const width = frameWidth;
    const height = frameHeight;
    const dest = new Float32Array(width * height);
    const radius = r.width() * 0.5;
    const [value, cx, cy] = circleDetectRadius(
        edgeData,
        dest,
        radius,
        width,
        height,
        r.midX() - radius * 2,
        r.midY() - radius * 2,
        r.midX() + radius * 2,
        r.midY() + radius * 2
    );
    if (!r.contains(cx, cy)) {
        r.sensorMissing = Math.max(r.sensorMissing - 1, 0);
        return r.sensorMissing > 0;
    }
    r.sensorMissing = Math.min(r.sensorMissing + 1, 20);
    return true;
}

export function detectThermalReference(
    saltPepperData: Float32Array,
    smoothedData: Float32Array,
    previousThermalReference: ROIFeature | null,
    frameWidth: number,
    frameHeight: number
): ROIFeature | null {
    performance.mark("ed start");
    const edgeData = edgeDetect(smoothedData, frameWidth, frameHeight);
    performance.mark("ed end");
    performance.measure("edge detection", "ed start", "ed end");

    performance.mark("cd start");
    if (
        previousThermalReference &&
        circleStillPresent(
            previousThermalReference,
            saltPepperData,
            edgeData,
            frameWidth,
            frameHeight
        )
    ) {
        return previousThermalReference;
    }

    const [bestRadius, bestX, bestY] = circleDetect(
        edgeData,
        frameWidth,
        frameHeight
    );

    if (bestRadius <= 4 || bestRadius >= 6) {
        return null;
    }
    const r = new ROIFeature();
    r.x0 = bestX - bestRadius;
    r.y0 = bestY - bestRadius;
    r.x1 = bestX + bestRadius;
    r.y1 = bestY + bestRadius;
    performance.mark("cd end");
    performance.measure("circle detection", "cd start", "cd end");
    return r;
}
