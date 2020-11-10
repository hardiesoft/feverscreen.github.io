export var ScreeningState;
(function (ScreeningState) {
    ScreeningState["INIT"] = "INIT";
    ScreeningState["WARMING_UP"] = "WARMING_UP";
    ScreeningState["READY"] = "READY";
    ScreeningState["HEAD_LOCK"] = "HEAD_LOCK";
    ScreeningState["TOO_FAR"] = "TOO_FAR";
    ScreeningState["LARGE_BODY"] = "LARGE_BODY";
    ScreeningState["FACE_LOCK"] = "FACE_LOCK";
    ScreeningState["FRONTAL_LOCK"] = "FRONTAL_LOCK";
    ScreeningState["STABLE_LOCK"] = "STABLE_LOCK";
    ScreeningState["MEASURED"] = "MEASURED";
    ScreeningState["MISSING_THERMAL_REF"] = "MISSING_REF";
    ScreeningState["BLURRED"] = "BLURRED";
    ScreeningState["AFTER_FFC_EVENT"] = "AFTER_FFC_EVENT";
})(ScreeningState || (ScreeningState = {}));
function getScreeningState(state) {
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
        case 10:
            screeningState = ScreeningState.BLURRED;
            break;
        case 11:
            screeningState = ScreeningState.AFTER_FFC_EVENT;
            break;
    }
    return screeningState;
}
export function extractFrameInfo(analysisResult) {
    const f = analysisResult.face;
    const h = f.head;
    const tL = h.top_left;
    const tR = h.top_right;
    const bL = h.bottom_left;
    const bR = h.bottom_right;
    const sP = f.sample_point;
    const iSP = f.ideal_sample_point;
    const hS = analysisResult.heat_stats;
    const ref = analysisResult.thermal_ref;
    const geom = ref.geom;
    const cP = geom.center;
    const copiedAnalysisResult = {
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
            idealSamplePoint: {
                x: iSP.x,
                y: iSP.y
            },
            idealSampleTemp: f.ideal_sample_temp,
            idealSampleValue: f.ideal_sample_value,
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
    iSP.free();
    hS.free();
    cP.free();
    geom.free();
    ref.free();
    analysisResult.free();
    return copiedAnalysisResult;
}
