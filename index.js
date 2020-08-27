import * as cptvPlayer from './cptv-player/cptv_player.js';
import * as smooth from "./smooth/smooth.js";
import * as curveFit from "./curve-fit/curve_fitting.js";
import { detectThermalReference, extractSensorValueForCircle } from "./feature-detection.js";
import { ScreeningState } from './screening.js';
import { cloneShape, faceArea, faceIntersectsThermalRef, fillVerticalCracks, getRawShapes, largestShape } from "./geom.js";
import { advanceState, detectBody, extractFaceInfo, getNeck, guessApproximateHeadWidth, motionBit, preprocessShapes, refineHeadThresholdData, refineThresholdData, rotate90, thresholdBit } from "./body-detection.js";
import { drawBackgroundImage, drawFace, drawHistogram, drawShapes } from "./debug-drawing.js";
const minFrame = -1; //256;//151;
const maxFrame = -1; //315;//195;
export const WIDTH = 120;
export const HEIGHT = 160;
(async function main() {
    const frameBuffer = new ArrayBuffer(WIDTH * HEIGHT * 2);
    const dropZone = document.getElementById('drop');
    // Setup drop zone
    dropZone.addEventListener('drop', async (event) => {
        event.preventDefault();
        if (event.dataTransfer && event.dataTransfer.items) {
            document.getElementById("instructions").style.display = 'none';
            for (let i = 0; i < event.dataTransfer.items.length; i++) {
                if (event.dataTransfer.items[i].kind === 'file') {
                    let file = event.dataTransfer.items[i].getAsFile();
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
    smooth.initialize(WIDTH, HEIGHT);
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
    const files = [
    //"/cptv-files/bunch of people downstairs walking towards camera 20200812.161144.768.cptv"
    //"/cptv-files/0.7.5beta recording-1 2708.cptv"
    ];
    if (files.length) {
        const dropZone = document.getElementById("drop");
        if (dropZone) {
            dropZone.parentElement.removeChild(dropZone);
        }
    }
    for (const file of files) {
        const cptvFile = await fetch(file);
        const buffer = await cptvFile.arrayBuffer();
        await renderFile(buffer, frameBuffer);
    }
}());
async function renderFile(buffer, frameBuffer) {
    const dropZone = document.getElementById("drop");
    if (dropZone) {
        dropZone.parentElement.removeChild(dropZone);
    }
    cptvPlayer.initWithCptvData(new Uint8Array(buffer));
    const toggleOpacity = (item) => {
        if (item.classList.contains('off')) {
            item.classList.remove('off');
            item.classList.add('on');
        }
        else {
            item.classList.add('off');
            item.classList.remove('on');
        }
    };
    const toggleActive = (item) => {
        if (item.classList.contains('active')) {
            item.classList.remove('active');
        }
        else {
            item.classList.add('active');
        }
    };
    document.getElementById("toggle-bg").addEventListener('click', (e) => {
        toggleActive(e.target);
        document.querySelectorAll('.bg2').forEach(toggleOpacity);
    });
    document.getElementById("toggle-motion").addEventListener('click', (e) => {
        toggleActive(e.target);
        document.querySelectorAll('.bg').forEach(toggleOpacity);
    });
    document.getElementById("toggle-threshold").addEventListener('click', (e) => {
        toggleActive(e.target);
        document.querySelectorAll('.threshold').forEach(toggleOpacity);
    });
    document.getElementById("toggle-edges").addEventListener('click', (e) => {
        toggleActive(e.target);
        document.querySelectorAll('.edge').forEach(toggleOpacity);
    });
    document.getElementById("toggle-analysis").addEventListener('click', (e) => {
        toggleActive(e.target);
        document.querySelectorAll('.analysis').forEach(toggleOpacity);
    });
    let frameNumber = -1;
    const seenFrames = new Set();
    let thermalReference = null;
    let screeningState = ScreeningState.READY;
    let screeningStateCount = 0;
    let prevFace = null;
    let prevThermalReference = null;
    let startTime = 0;
    let seenBody = false;
    const refImages = {};
    let prevFrame = null;
    let prevMotion = {
        motion: 0,
        motionPlusThreshold: 0,
        actionInBottomHalf: 0,
        thresholded: 0
    };
    while (!seenFrames.has(frameNumber)) {
        seenFrames.add(frameNumber);
        const frameInfo = cptvPlayer.getRawFrame(new Uint8Array(frameBuffer));
        frameNumber = frameInfo.frame_number;
        performance.mark(`start frame ${frameNumber}`);
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
        // if (frameNumber < 25 || frameNumber > 27) {
        //     continue;
        // }
        // if (frameNumber < 66 || frameNumber > 67) {
        //     continue;
        // }
        // if (frameNumber < 1066 || frameNumber > 1121) {
        //     continue;
        // }
        //
        // if (frameNumber < 1071 || frameNumber > 1074) {
        //     continue;
        // }
        //
        // if (frameNumber < 248 || frameNumber > 268) {
        //     continue;
        // }
        // if (frameNumber < 1126 || frameNumber > 1139) {
        //     continue;
        // }
        if (minFrame !== -1 && frameNumber < minFrame) {
            continue;
        }
        if (maxFrame !== -1 && frameNumber > maxFrame) {
            break;
        }
        const div = document.createElement("div");
        div.className = "c-container";
        const text = document.createElement("p");
        const analysisCanvas = document.createElement("canvas");
        analysisCanvas.id = `f-${frameInfo.frame_number}`;
        analysisCanvas.className = 'analysis';
        analysisCanvas.width = WIDTH;
        analysisCanvas.height = HEIGHT;
        const ctx = analysisCanvas.getContext('2d');
        const currentFrameNumber = frameNumber;
        analysisCanvas.addEventListener('mousemove', (e) => {
            const rect = e.target.getBoundingClientRect();
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
        // TODO(jon): Should really rotate the 16bit array
        const fr = new Float32Array(new Uint16Array(frameBuffer));
        const frame = rotate90(fr, new Float32Array(fr.length));
        // Now do smoothing...
        smooth.smooth(frame, 16);
        const thresholded = smooth.getThresholded();
        const radialSmoothed = new Float32Array(smooth.getRadialSmoothed());
        refImages[frameNumber] = radialSmoothed;
        const medianSmoothed = smooth.getMedianSmoothed();
        const { min, max, threshold } = smooth.getHeatStats();
        const histogram = smooth.getHistogram();
        // If there's not enough weight above the threshold, move down until there is.
        drawBackgroundImage(backgroundCanvas, frame, min, max);
        // TODO(jon):
        const thermalRef = detectThermalReference(medianSmoothed, radialSmoothed, prevThermalReference, 120, 160);
        const edgeData = thermalRef.edgeData;
        //drawBackgroundImage(sobelCanvas, edgeData, 0, 255);
        thermalReference = thermalRef.r;
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
        let face = null;
        let body = null;
        const { hasBody, data, adjustedThreshold, motionStats } = detectBody(edgeData, thermalReference, medianSmoothed, radialSmoothed, prevFrame, min, max, threshold, thermalRefC, thermalRefRaw);
        {
            // Draw edges:
            let sMin = Number.MAX_SAFE_INTEGER;
            let sMax = 0;
            for (let i = 0; i < edgeData.length; i++) {
                sMin = Math.min(sMin, edgeData[i]);
                sMax = Math.max(sMax, edgeData[i]);
            }
        }
        prevFrame = new Float32Array(radialSmoothed);
        if (hasBody && thermalReference) {
            // Remove motion shapes that don't overlap a threshold.
            // Remove threshold shapes that don't overlap some motion shape.
            let rawShapes = getRawShapes(data, WIDTH, HEIGHT, motionBit);
            //drawRawShapes(rawShapes, frameNumber, motionCanvas);
            drawHistogram(hist, histogram, min, max, adjustedThreshold);
            const pointCloud = refineThresholdData(data);
            let approxHeadWidth = 0;
            rawShapes = getRawShapes(data, WIDTH, HEIGHT, thresholdBit);
            let { shapes, didMerge: maybeHasGlasses } = preprocessShapes(rawShapes);
            drawShapes(shapes, frameNumber, thresholdCanvas, 0x99003333);
            if (shapes.length) {
                body = largestShape(shapes);
                //drawShapes([body], frameNumber, analysisCanvas);
                fillVerticalCracks(body);
                approxHeadWidth = guessApproximateHeadWidth(cloneShape(body));
                let neck = null;
                if (approxHeadWidth > 0) {
                    // FIXME(jon) - this method of guessing head width doesn't always work, ie. if the person has long hair or a hood,
                    // and they don't have a bit where their face dips in again after flaring out.
                    // Maybe get the possible range that the neck can be in from the width at the top of the body convex hull?
                    const searchStart = Math.min(Math.ceil(approxHeadWidth), body.length - 1);
                    const searchEnd = Math.min(Math.ceil(approxHeadWidth * 1.7), body.length - 1);
                    const slice = body.slice(searchStart, searchEnd);
                    if (slice.length) {
                        neck = getNeck(slice);
                    }
                }
                if (neck) {
                    refineHeadThresholdData(data, neck, pointCloud);
                    // Draw head hull into canvas context, mask out threshold bits we care about:
                    let rawShapes = getRawShapes(data, WIDTH, HEIGHT, thresholdBit);
                    let { shapes, didMerge: maybeHasGlasses } = preprocessShapes(rawShapes);
                    const faceShape = largestShape(shapes);
                    if (faceShape.length) {
                        face = extractFaceInfo(neck, faceShape, radialSmoothed, maybeHasGlasses);
                        if (face) {
                            drawShapes([faceShape], frameNumber, analysisCanvas, 0x330000ff);
                            drawFace(face, analysisCanvas, adjustedThreshold, radialSmoothed);
                        }
                    }
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'red';
                    ctx.beginPath();
                    ctx.moveTo(neck.left.x, neck.left.y);
                    ctx.lineTo(neck.right.x, neck.right.y);
                    ctx.stroke();
                }
                // TODO(jon): If half the face is off-frame, null out face.
            }
            if (seenBody) {
                startTime += (1000 / 8.7);
            }
            if (body) {
                seenBody = true;
            }
            if (face) {
                if (faceArea(face) > 1500 && !faceIntersectsThermalRef(face, thermalReference)) {
                    drawFace(face, analysisCanvas, adjustedThreshold, radialSmoothed);
                }
                else if (body) {
                    // TODO(jon): draw tracking oval of some kind.
                }
            }
            let thermalRefRect = { x0: 0, x1: 0, y0: 0, y1: 0 };
            if (thermalReference) {
                const thermalRefCircleWidth = thermalReference.x1 - thermalReference.x0;
                const fudgeFactor = 1;
                const radius = (thermalRefCircleWidth * 0.5);
                const thermalRefIsOnLeft = thermalReference.x0 < WIDTH / 2;
                if (thermalRefIsOnLeft) {
                    thermalRefRect = {
                        x0: Math.max(0, (thermalReference.x0 - radius) - fudgeFactor),
                        x1: Math.min(WIDTH - 1, (thermalReference.x1 + radius) + fudgeFactor),
                        y0: Math.max(0, (thermalReference.y0 - radius) - fudgeFactor),
                        y1: Math.min(HEIGHT - 1, (thermalReference.y1 + (radius * 5)) + fudgeFactor)
                    };
                }
                else {
                    thermalRefRect = {
                        x0: Math.max(0, (thermalReference.x0 - ((radius * 1.8) + fudgeFactor))),
                        x1: Math.min(WIDTH - 1, (thermalReference.x1 + (radius * 1.8)) + fudgeFactor),
                        y0: Math.max(0, (thermalReference.y0 - ((radius * 8) + fudgeFactor))),
                        y1: HEIGHT - 1
                    };
                }
            }
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(thermalReference.midX(), thermalReference.midY(), (thermalReference.x1 - thermalReference.x0) * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'blue';
            ctx.beginPath();
            ctx.moveTo(thermalRefRect.x0, thermalRefRect.y0);
            ctx.lineTo(thermalRefRect.x1, thermalRefRect.y0);
            ctx.lineTo(thermalRefRect.x1, thermalRefRect.y1);
            ctx.lineTo(thermalRefRect.x0, thermalRefRect.y1);
            ctx.lineTo(thermalRefRect.x0, thermalRefRect.y0);
            ctx.stroke();
        }
        prevThermalReference = thermalReference;
        const prevState = screeningState;
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
            }
            else {
                div.classList.add(advanced.state);
            }
        }
        else {
            div.classList.add(advanced.state);
        }
        if (thermalReference) {
            //console.log((thermalReference.x1 - thermalReference.x0) * 0.5);
            const ctx = analysisCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(thermalReference.midX(), thermalReference.midY(), (thermalReference.x1 - thermalReference.x0) * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        //<br>${seenBody && advanced.event ? `${(startTime/ 1000).toFixed(2)}s elapsed` : ''}<br>${advanced.event}<br>
        textState.innerHTML = `#${frameNumber}, ${screeningState}(${screeningStateCount})
Threshold ${(thermalRefC + (adjustedThreshold - thermalRefRaw) * 0.01).toFixed(2)}C&deg;
<br>Motion: ${motionStats.motion}<br>Threshold: ${motionStats.thresholded}<br>Both: ${motionStats.motionPlusThreshold}<br>Bottom: ${motionStats.actionInBottomHalf}`;
        // Write the screening state out to a text block.
        performance.mark(`end frame ${frameNumber}`);
        performance.measure(`frame ${frameNumber}`, `start frame ${frameNumber}`, `end frame ${frameNumber}`);
    }
}
