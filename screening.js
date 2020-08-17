export var ScreeningState;
(function (ScreeningState) {
    ScreeningState["WARMING_UP"] = "WARMING_UP";
    ScreeningState["READY"] = "READY";
    ScreeningState["HEAD_LOCK"] = "HEAD_LOCK";
    ScreeningState["TOO_FAR"] = "TOO_FAR";
    ScreeningState["LARGE_BODY"] = "LARGE_BODY";
    ScreeningState["MULTIPLE_HEADS"] = "MULTIPLE_HEADS";
    ScreeningState["FACE_LOCK"] = "FACE_LOCK";
    ScreeningState["FRONTAL_LOCK"] = "FRONTAL_LOCK";
    ScreeningState["STABLE_LOCK"] = "STABLE_LOCK";
    ScreeningState["LEAVING"] = "LEAVING";
    ScreeningState["MISSING_THERMAL_REF"] = "MISSING_REF";
})(ScreeningState || (ScreeningState = {}));
// This describes the state machine of allowed state transitions for the screening event.
export const ScreeningAcceptanceStates = {
    [ScreeningState.WARMING_UP]: [ScreeningState.READY, ScreeningState.MISSING_THERMAL_REF],
    [ScreeningState.MULTIPLE_HEADS]: [
        ScreeningState.READY,
        ScreeningState.HEAD_LOCK,
        ScreeningState.FACE_LOCK,
        ScreeningState.FRONTAL_LOCK,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.LARGE_BODY]: [
        ScreeningState.READY,
        ScreeningState.HEAD_LOCK,
        ScreeningState.MULTIPLE_HEADS,
        ScreeningState.FACE_LOCK,
        ScreeningState.FRONTAL_LOCK,
        ScreeningState.TOO_FAR,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.TOO_FAR]: [
        ScreeningState.READY,
        ScreeningState.HEAD_LOCK,
        ScreeningState.MULTIPLE_HEADS,
        ScreeningState.FACE_LOCK,
        ScreeningState.FRONTAL_LOCK,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.READY]: [
        ScreeningState.TOO_FAR,
        ScreeningState.LARGE_BODY,
        ScreeningState.HEAD_LOCK,
        ScreeningState.MULTIPLE_HEADS,
        ScreeningState.FACE_LOCK,
        ScreeningState.FRONTAL_LOCK,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.FACE_LOCK]: [
        ScreeningState.TOO_FAR,
        ScreeningState.LARGE_BODY,
        ScreeningState.HEAD_LOCK,
        ScreeningState.MULTIPLE_HEADS,
        ScreeningState.FRONTAL_LOCK,
        ScreeningState.READY,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.FRONTAL_LOCK]: [
        ScreeningState.TOO_FAR,
        ScreeningState.LARGE_BODY,
        ScreeningState.STABLE_LOCK,
        ScreeningState.FACE_LOCK,
        ScreeningState.MULTIPLE_HEADS,
        ScreeningState.HEAD_LOCK,
        ScreeningState.READY,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.HEAD_LOCK]: [
        ScreeningState.TOO_FAR,
        ScreeningState.LARGE_BODY,
        ScreeningState.FACE_LOCK,
        ScreeningState.FRONTAL_LOCK,
        ScreeningState.READY,
        ScreeningState.MULTIPLE_HEADS,
        ScreeningState.MISSING_THERMAL_REF
    ],
    [ScreeningState.STABLE_LOCK]: [ScreeningState.LEAVING],
    [ScreeningState.LEAVING]: [ScreeningState.READY],
    [ScreeningState.MISSING_THERMAL_REF]: [
        ScreeningState.READY,
        ScreeningState.TOO_FAR,
        ScreeningState.LARGE_BODY
    ],
};
