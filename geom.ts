import {Vec2} from "./index.js";

export function magnitude(vec: Vec2): number {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

export function normalise(vec: Vec2): Vec2 {
    const len = magnitude(vec);
    return {
        x: vec.x / len,
        y: vec.y / len
    };
}

export function scale(vec: Vec2, scale: number): Vec2 {
    return {
        x: vec.x * scale,
        y: vec.y * scale
    };
}

export function perp(vec: Vec2): Vec2 {
    // noinspection JSSuspiciousNameCombination
    return {
        x: vec.y,
        y: -vec.x
    };
}

export function add(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    };
}