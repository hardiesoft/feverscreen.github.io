import {RawPoint} from "./geom.js";

function pointInPolygon(point: RawPoint, vs: RawPoint[]) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0],
            yi = vs[i][1];
        const xj = vs[j][0],
            yj = vs[j][1];

        const intersect =
            yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
}
const e = 134217729,
    n = 33306690738754706e-32;
function r(
    t: number,
    e: Float64Array,
    n: number,
    r: Float64Array,
    o: Float64Array
) {
    let f,
        i,
        u,
        c,
        s = e[0],
        a = r[0],
        d = 0,
        l = 0;
    a > s == a > -s ? ((f = s), (s = e[++d])) : ((f = a), (a = r[++l]));
    let p = 0;
    if (d < t && l < n)
        for (
            a > s == a > -s
                ? ((u = f - ((i = s + f) - s)), (s = e[++d]))
                : ((u = f - ((i = a + f) - a)), (a = r[++l])),
                f = i,
            0 !== u && (o[p++] = u);
            d < t && l < n;

        )
            a > s == a > -s
                ? ((u = f - ((i = f + s) - (c = i - f)) + (s - c)), (s = e[++d]))
                : ((u = f - ((i = f + a) - (c = i - f)) + (a - c)), (a = r[++l])),
                (f = i),
            0 !== u && (o[p++] = u);
    for (; d < t; )
        (u = f - ((i = f + s) - (c = i - f)) + (s - c)),
            (s = e[++d]),
            (f = i),
        0 !== u && (o[p++] = u);
    for (; l < n; )
        (u = f - ((i = f + a) - (c = i - f)) + (a - c)),
            (a = r[++l]),
            (f = i),
        0 !== u && (o[p++] = u);
    return (0 === f && 0 !== p) || (o[p++] = f), p;
}
function o(t: number) {
    return new Float64Array(t);
}
const f = 33306690738754716e-32,
    i = 22204460492503146e-32,
    u = 11093356479670487e-47,
    c = o(4),
    s = o(8),
    a = o(12),
    d = o(16),
    l = o(4);
export function orient(
    t: number,
    o: number,
    p: number,
    b: number,
    y: number,
    h: number
) {
    const M = (o - h) * (p - y),
        x = (t - y) * (b - h),
        j = M - x;
    if (0 === M || 0 === x || M > 0 != x > 0) return j;
    const m = Math.abs(M + x);
    return Math.abs(j) >= f * m
        ? j
        : -(function(t, o, f, p, b, y, h) {
            let M, x, j, m, _, v, w, A, F, O, P, g, k, q, z, B, C, D;
            const E = t - b,
                G = f - b,
                H = o - y,
                I = p - y;
            (_ =
                (z =
                    (A = E - (w = (v = e * E) - (v - E))) *
                    (O = I - (F = (v = e * I) - (v - I))) -
                    ((q = E * I) - w * F - A * F - w * O)) -
                (P =
                    z -
                    (C =
                        (A = H - (w = (v = e * H) - (v - H))) *
                        (O = G - (F = (v = e * G) - (v - G))) -
                        ((B = H * G) - w * F - A * F - w * O)))),
                (c[0] = z - (P + _) + (_ - C)),
                (_ = (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) - (P = k - B)),
                (c[1] = k - (P + _) + (_ - B)),
                (_ = (D = g + P) - g),
                (c[2] = g - (D - _) + (P - _)),
                (c[3] = D);
            let J = (function(t, e) {
                    let n = e[0];
                    for (let r = 1; r < t; r++) n += e[r];
                    return n;
                })(4, c),
                K = i * h;
            if (J >= K || -J >= K) return J;
            if (
                ((M = t - (E + (_ = t - E)) + (_ - b)),
                    (j = f - (G + (_ = f - G)) + (_ - b)),
                    (x = o - (H + (_ = o - H)) + (_ - y)),
                    (m = p - (I + (_ = p - I)) + (_ - y)),
                0 === M && 0 === x && 0 === j && 0 === m)
            )
                return J;
            if (
                ((K = u * h + n * Math.abs(J)),
                (J += E * m + I * M - (H * j + G * x)) >= K || -J >= K)
            )
                return J;
            (_ =
                (z =
                    (A = M - (w = (v = e * M) - (v - M))) *
                    (O = I - (F = (v = e * I) - (v - I))) -
                    ((q = M * I) - w * F - A * F - w * O)) -
                (P =
                    z -
                    (C =
                        (A = x - (w = (v = e * x) - (v - x))) *
                        (O = G - (F = (v = e * G) - (v - G))) -
                        ((B = x * G) - w * F - A * F - w * O)))),
                (l[0] = z - (P + _) + (_ - C)),
                (_ = (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) - (P = k - B)),
                (l[1] = k - (P + _) + (_ - B)),
                (_ = (D = g + P) - g),
                (l[2] = g - (D - _) + (P - _)),
                (l[3] = D);
            const L = r(4, c, 4, l, s);
            (_ =
                (z =
                    (A = E - (w = (v = e * E) - (v - E))) *
                    (O = m - (F = (v = e * m) - (v - m))) -
                    ((q = E * m) - w * F - A * F - w * O)) -
                (P =
                    z -
                    (C =
                        (A = H - (w = (v = e * H) - (v - H))) *
                        (O = j - (F = (v = e * j) - (v - j))) -
                        ((B = H * j) - w * F - A * F - w * O)))),
                (l[0] = z - (P + _) + (_ - C)),
                (_ = (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) - (P = k - B)),
                (l[1] = k - (P + _) + (_ - B)),
                (_ = (D = g + P) - g),
                (l[2] = g - (D - _) + (P - _)),
                (l[3] = D);
            const N = r(L, s, 4, l, a);
            (_ =
                (z =
                    (A = M - (w = (v = e * M) - (v - M))) *
                    (O = m - (F = (v = e * m) - (v - m))) -
                    ((q = M * m) - w * F - A * F - w * O)) -
                (P =
                    z -
                    (C =
                        (A = x - (w = (v = e * x) - (v - x))) *
                        (O = j - (F = (v = e * j) - (v - j))) -
                        ((B = x * j) - w * F - A * F - w * O)))),
                (l[0] = z - (P + _) + (_ - C)),
                (_ = (k = q - ((g = q + P) - (_ = g - q)) + (P - _)) - (P = k - B)),
                (l[1] = k - (P + _) + (_ - B)),
                (_ = (D = g + P) - g),
                (l[2] = g - (D - _) + (P - _)),
                (l[3] = D);
            const Q = r(N, a, 4, l, d);
            return d[Q - 1];
        })(t, o, p, b, y, h, m);
}

function cross(p1: RawPoint, p2: RawPoint, p3: RawPoint) {
    return orient(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
}

function compareByX(a: RawPoint, b: RawPoint) {
    return a[0] === b[0] ? a[1] - b[1] : a[0] - b[0];
}

function convexHull(points: RawPoint[]): RawPoint[] {
    points.sort(compareByX);
    const lower = [];
    for (let i = 0; i < points.length; i++) {
        while (
            lower.length >= 2 &&
            cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0
            ) {
            lower.pop();
        }
        lower.push(points[i]);
    }

    const upper = [];
    for (let ii = points.length - 1; ii >= 0; ii--) {
        while (
            upper.length >= 2 &&
            cross(upper[upper.length - 2], upper[upper.length - 1], points[ii]) <= 0
            ) {
            upper.pop();
        }
        upper.push(points[ii]);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper);
}

// speed up convex hull by filtering out points inside quadrilateral formed by 4 extreme points
export function fastConvexHull(points: RawPoint[]): RawPoint[] {
    let left = points[0];
    let top = points[0];
    let right = points[0];
    let bottom = points[0];

    // find the leftmost, rightmost, topmost and bottommost points
    for (const p of points) {
        if (p[0] < left[0]) {
            left = p;
        }
        if (p[0] > right[0]) {
            right = p;
        }
        if (p[1] < top[1]) {
            top = p;
        }
        if (p[1] > bottom[1]) {
            bottom = p;
        }
    }

    // filter out points that are inside the resulting quadrilateral
    const cull = [left, top, right, bottom];
    const filtered = cull.slice();
    for (const p of points) {
        if (!pointInPolygon(p, cull)) filtered.push(p);
    }

    // get convex hull around the filtered points
    return convexHull(filtered);
}
