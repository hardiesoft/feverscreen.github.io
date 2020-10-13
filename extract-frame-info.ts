import {AnalysisResult as WasmAnalysisResult} from "./processing/smooth";

export interface Point {
    x: number;
    y: number;
}

export interface Circle {
    center: Point;
    radius: number;
}

export interface ThermalReference {
    geom: Circle;
    val: number;
    temp: number;
}

export enum ScreeningState {
    INIT = "INIT",
    WARMING_UP = "WARMING_UP",
    READY = "READY", // no face
    HEAD_LOCK = "HEAD_LOCK",
    TOO_FAR = "TOO_FAR",
    LARGE_BODY = "LARGE_BODY",
    FACE_LOCK = "FACE_LOCK", // has face
    FRONTAL_LOCK = "FRONTAL_LOCK", // Face is front-on
    STABLE_LOCK = "STABLE_LOCK", // Face has not changed in size or position for a couple of frames.
    MEASURED = "MEASURED", // Temperature snapshot taken, waiting for the person to leave the frame.
    MISSING_THERMAL_REF = "MISSING_REF"
}

export interface FaceInfo {
    halfwayRatio: number;
    headLock: number;
    isValid: boolean;
    samplePoint: Point;
    sampleValue: number;
    sampleTemp: number;
    head: {
        topLeft: Point;
        topRight: Point;
        bottomLeft: Point;
        bottomRight: Point;
    };
}

export interface AnalysisResult {
    motionSum: number;
    motionThresholdSum: number;
    thresholdSum: number;
    frameBottomSum: number;
    heatStats: {
        min: number;
        max: number;
        threshold: number;
    };
    face: FaceInfo;
    nextState: ScreeningState;
    hasBody: boolean;
    thermalRef: ThermalReference;
}


function getScreeningState(state: number): ScreeningState {
    let screeningState = ScreeningState.INIT;
    switch (state) {
        case 0:
            screeningState = ScreeningState.WARMING_UP;
            break;
        case 1:
            screeningState = ScreeningState.READY;
            break;
        case 2:
            screeningState = ScreeningState.HEAD_LOCK;
            break;
        case 3:
            screeningState = ScreeningState.TOO_FAR;
            break;
        case 4:
            screeningState = ScreeningState.LARGE_BODY;
            break;
        case 5:
            screeningState = ScreeningState.FACE_LOCK;
            break;
        case 6:
            screeningState = ScreeningState.FRONTAL_LOCK;
            break;
        case 7:
            screeningState = ScreeningState.STABLE_LOCK;
            break;
        case 8:
            screeningState = ScreeningState.MEASURED;
            break;
        case 9:
            screeningState = ScreeningState.MISSING_THERMAL_REF;
            break;
    }
    return screeningState;
}

export function extractFrameInfo(analysisResult: WasmAnalysisResult): AnalysisResult {
    const f = analysisResult.face;
    const h = f.head;
    const tL = h.top_left;
    const tR = h.top_right;
    const bL = h.bottom_left;
    const bR = h.bottom_right;
    const sP = f.sample_point;
    const hS = analysisResult.heat_stats;
    const ref = analysisResult.thermal_ref;
    const geom = ref.geom;
    const cP = geom.center;
    const copiedAnalysisResult: AnalysisResult = {
        face: {
            headLock: f.head_lock,
            head: {
                topLeft: {
                    x: tL.x,
                    y: tL.y
                },
                topRight: {
                    x: tR.x,
                    y: tR.y
                },
                bottomLeft: {
                    x: bL.x,
                    y: bL.y
                },
                bottomRight: {
                    x: bR.x,
                    y: bR.y
                }
            },
            samplePoint: {
                x: sP.x,
                y: sP.y
            },
            sampleTemp: f.sample_temp,
            sampleValue: f.sample_value,
            halfwayRatio: f.halfway_ratio,
            isValid: f.is_valid
        },
        frameBottomSum: analysisResult.frame_bottom_sum,
        motionSum: analysisResult.motion_sum,
        heatStats: {
            threshold: hS.threshold,
            min: hS.min,
            max: hS.max
        },
        motionThresholdSum: analysisResult.motion_threshold_sum,
        thresholdSum: analysisResult.threshold_sum,
        nextState: getScreeningState(analysisResult.next_state),
        hasBody: analysisResult.has_body,
        thermalRef: {
            geom: {
                center: {
                    x: cP.x,
                    y: cP.y
                },
                radius: geom.radius
            },
            val: ref.val,
            temp: ref.temp
        }
    };

    f.free();
    h.free();
    tL.free();
    tR.free();
    bL.free();
    bR.free();
    sP.free();
    hS.free();
    cP.free();
    geom.free();
    ref.free();
    analysisResult.free();
    return copiedAnalysisResult;
}
