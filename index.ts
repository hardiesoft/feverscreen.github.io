import * as cptvPlayer from './cptv-player/cptv_player.js';
import * as analysis from "./processing/tko_processing.js";
import * as curveFit from "./curve-fit/curve_fitting.js";
import {drawBackgroundImage} from "./debug-drawing.js";
import {extractFrameInfo, ScreeningState} from "./extract-frame-info.js";

//const minFrame: number = 60;//423;//62;
//const maxFrame: number = 73;//73;

// 1454 - 1463 looks weird.

// TODO(jon): Other interesting frames
// const minFrame = 386;
// const maxFrame = 418;
// const minFrame = 991;
// const maxFrame = 1034;

// Interesting motion detection fail: - Might be removing the wrong clusters, since we're only checking against the
// largest one?
// 1079 - 1100
//
// const minFrame = 0;
// const maxFrame = 40;
// const minFrame: number = 0;
// const maxFrame: number = 73;

//"/cptv-files/bunch of people in small meeting room 20200812.134427.735.cptv"
// const minFrame: number = 440;
// const maxFrame: number = 504;

const minFrame: number = 32;//25; //32
const maxFrame: number = -1;//150;

// Side on heads: 601, 635 - 656, 842 - 861, 995 - 1000 (997)

export const WIDTH = 120;
export const HEIGHT = 160;

(async function main() {
    const frameBuffer = new ArrayBuffer(WIDTH * HEIGHT * 2);
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
    await analysis.default();
    await curveFit.default();
    analysis.initialize(WIDTH, HEIGHT);
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
    const files: string[] = [
        //"/cptv-files/bunch of people downstairs walking towards camera 20200812.161144.768.cptv"
        //"/cptv-files/bunch of people in small meeting room 20200812.134427.735.cptv"
        //"/cptv-files/0.7.5beta recording-1 2708.cptv"
        //"/cptv-files/Slow_to_read_20201022.075606.875[1].cptv",
        "/cptv-files/Missed_Saffy.cptv"
        //"/cptv-files/20200921.155036.812.cptv"
        //"/cptv-files/20200729.104543.646.cptv",
        //"/cptv-files/Shaun_hot_-_should_be_36.6_20201014.160228.321[1].cptv",
        //"/cptv-files/Clare_cold_-_with_hair_on_forehead_-_should_be_36.5_20201014.160445.207[1].cptv"
        //"/cptv-files/20201006.103814.162-obscured-ref.cptv"
        //"/cptv-files/2_people_20200929.151113.294.cptv"
    ];
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
    // (document.getElementById("toggle-edges") as HTMLButtonElement).addEventListener('click', (e) => {
    //     toggleActive(e.target as Element);
    //     document.querySelectorAll('.edge').forEach(toggleOpacity);
    // });
    (document.getElementById("toggle-edges-2") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.edge2').forEach(toggleOpacity);
    });
    (document.getElementById("toggle-analysis") as HTMLButtonElement).addEventListener('click', (e) => {
        toggleActive(e.target as Element);
        document.querySelectorAll('.analysis').forEach(toggleOpacity);
    });

    let frameNumber = -1;
    let ii = 0;
    const seenFrames = new Set();
    let prevFrame = new Float32Array(120 * 160);
    const timings = [];
    const refImages: Record<number, Float32Array> = {};
    let prevFrameStats = null;
    while (!seenFrames.has(frameNumber)) {
        seenFrames.add(frameNumber);
        const frameInfo = cptvPlayer.getRawFrame(new Uint8Array(frameBuffer));
        frameNumber = frameInfo.frame_number;
        if (minFrame !== -1 && frameNumber < minFrame) {
            continue;
        }
        if (maxFrame !== -1 && frameNumber > maxFrame) {
            break;
        }

        performance.mark(`start frame ${frameNumber}`);
        const s = performance.now();
        let frame = new Uint16Array(frameBuffer);
        // Now do smoothing...
        let frameStats = extractFrameInfo(analysis.analyse(frame, 38.5, frameInfo.time_on - frameInfo.last_ffc_time));
        performance.mark(`end frame ${frameNumber}`);
        performance.measure(`frame ${frameNumber}`, `start frame ${frameNumber}`, `end frame ${frameNumber}`);
        const e = performance.now();
        timings.push(e - s);
        if (!prevFrameStats) {
            prevFrameStats = frameStats;
        }
        const skipMissingThermalRefFrames = frameStats.nextState == ScreeningState.MISSING_THERMAL_REF && prevFrameStats.nextState === ScreeningState.MISSING_THERMAL_REF;
        const skipReadyFrames = frameStats.nextState === ScreeningState.READY && prevFrameStats.nextState === ScreeningState.READY;
        // if (skipMissingThermalRefFrames || skipReadyFrames) {
        //     continue;
        // }
        // TODO(jon): Skip all but the first thermal ref, then add a count of how many skipped.
        //  Do the same for READY
        const div = document.createElement("div");
        div.className = "c-container";
        const text = document.createElement("p");

        const analysisCanvas = document.createElement("canvas");
        analysisCanvas.id = `f-${frameInfo.frame_number}`;
        analysisCanvas.className = 'analysis';
        analysisCanvas.width = WIDTH;
        analysisCanvas.height = HEIGHT;

        const motionCanvas = document.createElement("canvas");
        motionCanvas.className = 'bg';
        motionCanvas.width = WIDTH;
        motionCanvas.height = HEIGHT;

        const backgroundCanvas = document.createElement("canvas");
        backgroundCanvas.className = 'bg2';
        backgroundCanvas.width = WIDTH;
        backgroundCanvas.height = HEIGHT;

        const sobelCanvas2 = document.createElement("canvas");
        sobelCanvas2.className = 'edge2';
        sobelCanvas2.width = WIDTH;
        sobelCanvas2.height = HEIGHT;

        const thresholdCanvas = document.createElement("canvas");
        thresholdCanvas.className = 'threshold';
        thresholdCanvas.width = WIDTH;
        thresholdCanvas.height = HEIGHT;


        const textState = document.createElement("div");
        textState.className = "text-state";

        div.appendChild(backgroundCanvas);
        div.appendChild(motionCanvas);
        div.appendChild(thresholdCanvas);
        div.appendChild(sobelCanvas2);
        div.appendChild(analysisCanvas);
        div.appendChild(text);
        div.appendChild(textState);
        document.body.appendChild(div);

        const maskData = analysis.getThresholded();
        {
            const ctx = thresholdCanvas.getContext('2d') as CanvasRenderingContext2D;
            const img = ctx.getImageData(0, 0, 120, 160);
            const imageData = new Uint32Array(img.data.buffer);
            const v = 255;
            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] & 1 << 6) {
                    imageData[i] = 0xaa << 24 | v << 16 | 0 << 8 | 0;
                }
            }
            ctx.putImageData(img, 0, 0);
        }
        {
            const ctx = motionCanvas.getContext('2d') as CanvasRenderingContext2D;
            const img = ctx.getImageData(0, 0, 120, 160);
            const imageData = new Uint32Array(img.data.buffer);
            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] & 1 << 2) { // 7
                    imageData[i] = 0x33ff00ff;
                }
            }
            ctx.putImageData(img, 0, 0);
        }

        {
            const ctx = sobelCanvas2.getContext('2d') as CanvasRenderingContext2D;
            const img = ctx.getImageData(0, 0, 120, 160);
            const imageData = new Uint32Array(img.data.buffer);
            for (let i = 0; i < maskData.length; i++) {
                if (maskData[i] & 1 << 3) {
                    imageData[i] = 0x2200ff00;
                }
            }
            ctx.putImageData(img, 0, 0);
        }

        const currentFrameNumber = frameNumber;

        const thermalRefRaw = frameStats.thermalRef.val;
        const thermalRefC = frameStats.thermalRef.temp;
        analysisCanvas.addEventListener('mousemove', (e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const x = Math.floor(Math.min(e.clientX - rect.x, 119));
            const y = Math.floor(Math.min(e.clientY - rect.y, 159));
            // NOTE: Taking into account frame rotation
            const index = y * 120 + x;
            const val = refImages[currentFrameNumber][index];
            const temp = thermalRefC + (val - thermalRefRaw) * 0.01;
            text.innerHTML = `(${x}, ${y}), ${temp.toFixed(2)}C&deg;<br>${~~val}::${~~thermalRefRaw} - #${currentFrameNumber}`;
        });
        analysisCanvas.addEventListener('mouseleave', (e) => {
            text.innerHTML = "";
        });

        div.classList.add(frameStats.nextState);
        prevFrame = new Float32Array(analysis.getMedianSmoothed());
        refImages[frameNumber] = prevFrame;

        let body = analysis.getBodyShape();
        const ctx = analysisCanvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';


        let bodyShape = [];
        for (let i = 0; i < body.length; i += 3) {
            let y = body[i];
            let x0 = body[i + 1];
            let x1 = body[i + 2];
            bodyShape.push({x0, x1, y});
            ctx.fillRect(x0, y, x1 - x0, 1);
        }



        let face = analysis.getFaceShape();
        //let faceShape = [];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < face.length; i += 3) {
            let y = face[i];
            let x0 = face[i + 1];
            let x1 = face[i + 2];
            //bodyShape.push({x0, x1, y});
            ctx.fillRect(x0, y, x1 - x0, 1);
        }

        const neckLeft = frameStats.face.head.bottomLeft;
        const neckRight = frameStats.face.head.bottomRight;
        const neckTopLeft = frameStats.face.head.topLeft;
        const neckTopRight = frameStats.face.head.topRight;
        const samplePoint = frameStats.face.samplePoint;
        const idealSamplePoint = frameStats.face.idealSamplePoint;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(neckLeft.x, neckLeft.y);
        ctx.lineTo(neckTopLeft.x, neckTopLeft.y);
        ctx.lineTo(neckTopRight.x, neckTopRight.y);
        ctx.lineTo(neckRight.x, neckRight.y);
        ctx.lineTo(neckLeft.x, neckLeft.y);
        ctx.stroke();

        // Take the first 5-10 px of the body shape, get the bounds.
        if (bodyShape.length >= 6) {
            ctx.strokeStyle = 'rgba(0, 250, 0, 0.9)';
            ctx.strokeRect(bodyShape[3].x0, bodyShape[0].y, bodyShape[3].x1 - bodyShape[3].x0, 4);
        }

        if (samplePoint.x !== 0) {
            ctx.strokeStyle = 'white';
            ctx.beginPath();
            ctx.arc(samplePoint.x, samplePoint.y, 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (idealSamplePoint.x !== 0) {
            ctx.strokeStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(idealSamplePoint.x, idealSamplePoint.y, 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(neckLeft.x, neckLeft.y, 1.5, 0, Math.PI * 2);
        ctx.arc(neckRight.x, neckRight.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        //
        // const pointsArray = new Uint8Array(bodyShape.length * 4);
        // if (bodyShape.length) {
        //     let i = 0;
        //     bodyShape.reverse();
        //     for (const row of bodyShape) {
        //         pointsArray[i++] = row.x1;
        //         pointsArray[i++] = row.y;
        //     }
        //     bodyShape.reverse();
        //     for (const row of bodyShape) {
        //         pointsArray[i++] = row.x0;
        //         pointsArray[i++] = row.y;
        //     }
        // }
        //
        //
        // if (pointsArray.length) {
        //     const bezierPts = curveFit.fitCurveThroughPoints(pointsArray, 1.5);
        //     ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        //     ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        //     ctx.lineWidth = 2;
        //     ctx.lineCap = "round";
        //     ctx.beginPath();
        //     ctx.moveTo(bezierPts[0], bezierPts[1]);
        //     for (let i = 2; i < bezierPts.length; i += 6) {
        //         ctx.bezierCurveTo(
        //             bezierPts[i],
        //             bezierPts[i + 1],
        //             bezierPts[i + 2],
        //             bezierPts[i + 3],
        //             bezierPts[i + 4],
        //             bezierPts[i + 5]
        //         );
        //     }
        //     ctx.stroke();
        // }


        /*
        if (hull.length) {
            ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(hull[0], hull[1]);
            for (let i = 2; i < hull.length; i+=2) {
                ctx.lineTo(hull[i], hull[i + 1]);
            }
            ctx.lineTo(hull[0], hull[1]);
            ctx.stroke();
        }
         */

        if (frameStats.thermalRef) {
            const thermalReference = frameStats.thermalRef;
            const ctx = analysisCanvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(thermalReference.geom.center.x + 0.5, thermalReference.geom.center.y + 0.5, thermalReference.geom.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        drawBackgroundImage(backgroundCanvas, prevFrame, frameStats.heatStats.min, frameStats.heatStats.max, frameStats.thermalRef);
        let output = "";
        if (ii !== frameNumber) {
            output = `#${frameNumber}/(${ii})`;
        } else {
            output = `#${frameNumber}`;
        }
        if (samplePoint.x !== 0) {
            output += `, <span class="temp">${frameStats.face.sampleTemp.toFixed(2)}&deg;C (${(frameStats.face.idealSampleTemp - frameStats.face.sampleTemp).toFixed(2)})diff</span>`;
        }
        output += `<br>Threshold: ${frameStats.heatStats.threshold} / ${(thermalRefC + (frameStats.heatStats.threshold - thermalRefRaw) * 0.01).toFixed(2)}C&deg;<br>Motion: ${frameStats.motionSum}`;
        textState.innerHTML = output;

        // TODO(jon): Output face threshold and inner canthus thresholds

        prevFrameStats = frameStats;
        // console.log(frameNumber, frameStats.heatStats.threshold);
        frameInfo.free();

        ii++;
    }
    timings.sort((a, b) => {
        return a - b;
    });
    console.log("Min", timings[0], "Max", timings[timings.length - 1], "Median", timings[Math.floor(timings.length / 2)]);
}
