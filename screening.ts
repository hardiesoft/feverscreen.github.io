
export enum ScreeningState {
    WARMING_UP = "WARMING_UP",
    READY = "READY", // no face
    HEAD_LOCK = "HEAD_LOCK",
    TOO_FAR = "TOO_FAR",
    LARGE_BODY = "LARGE_BODY",
    MULTIPLE_HEADS = "MULTIPLE_HEADS",
    FACE_LOCK = "FACE_LOCK", // has face
    FRONTAL_LOCK = "FRONTAL_LOCK", // Face is front-on
    STABLE_LOCK = "STABLE_LOCK", // Face has not changed in size or position for a couple of frames.
    LEAVING = "LEAVING", // has face, but not front-on
    MISSING_THERMAL_REF = "MISSING_REF"
}

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
    [ScreeningState.MISSING_THERMAL_REF]: [ScreeningState.READY],
};
