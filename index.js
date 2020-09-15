import * as cptvPlayer from './cptv-player/cptv_player.js';
import * as analysis from "./smooth/smooth.js";
import * as curveFit from "./curve-fit/curve_fitting.js";
import { drawBackgroundImage } from "./debug-drawing.js";
import { extractFrameInfo } from "./extract-frame-info.js";
const minFrame = -1;
const maxFrame = -1;
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
    const files = [
        "/cptv-files/bunch of people downstairs walking towards camera 20200812.161144.768.cptv"
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
    let prevFrame = new Float32Array(120 * 160);
    const timings = [];
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
        // analysisCanvas.addEventListener('mousemove', (e) => {
        //     const rect = (e.target as HTMLElement).getBoundingClientRect();
        //     const x = Math.floor(Math.min(e.clientX - rect.x, 119));
        //     const y = Math.floor(Math.min(e.clientY - rect.y, 159));
        //     const index = y * 120 + x;
        //     const val = refImages[currentFrameNumber][index];
        //     // TODO(jon): Double, and triple check this temperature calculation!
        //     const temp = thermalRefC + (val - thermalRefRaw) * 0.01;
        //     text.innerHTML = `(${x}, ${y}), ${temp.toFixed(2)}C&deg;<br>${~~val}::${~~thermalRefRaw} - #${currentFrameNumber}`;
        // });
        // analysisCanvas.addEventListener('mouseleave', (e) => {
        //     text.innerHTML = "";
        // });
        text.innerHTML = `# ${frameNumber}`;
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
        performance.mark(`start frame ${frameNumber}`);
        const s = performance.now();
        let frame = new Uint16Array(frameBuffer);
        // Now do smoothing...
        let info = analysis.analyse(frame, 38.5);
        if (info) {
            let frameStats = extractFrameInfo(info);
            div.classList.add(frameStats.nextState);
            prevFrame = new Float32Array(analysis.getRadialSmoothed());
            performance.mark(`end frame ${frameNumber}`);
            performance.measure(`frame ${frameNumber}`, `start frame ${frameNumber}`, `end frame ${frameNumber}`);
            const e = performance.now();
            timings.push(e - s);
            let body = analysis.getBodyShape();
            const ctx = analysisCanvas.getContext('2d');
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            let bodyShape = [];
            for (let i = 0; i < body.length; i += 3) {
                let y = body[i];
                let x0 = body[i + 1];
                let x1 = body[i + 2];
                bodyShape.push({ x0, x1, y });
                ctx.fillRect(x0, y, x1 - x0, 1);
            }
            const neckLeft = frameStats.face.head.bottomLeft;
            const neckRight = frameStats.face.head.bottomRight;
            const neckTopLeft = frameStats.face.head.topLeft;
            const neckTopRight = frameStats.face.head.topRight;
            const samplePoint = frameStats.face.samplePoint;
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.beginPath();
            ctx.moveTo(neckLeft.x, neckLeft.y);
            ctx.lineTo(neckTopLeft.x, neckTopLeft.y);
            ctx.lineTo(neckTopRight.x, neckTopRight.y);
            ctx.lineTo(neckRight.x, neckRight.y);
            ctx.lineTo(neckLeft.x, neckLeft.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(samplePoint.x, samplePoint.y, 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'green';
            ctx.beginPath();
            ctx.arc(neckLeft.x, neckLeft.y, 1.5, 0, Math.PI * 2);
            ctx.arc(neckRight.x, neckRight.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
            const pointsArray = new Uint8Array(bodyShape.length * 4);
            if (bodyShape.length) {
                let i = 0;
                bodyShape.reverse();
                for (const row of bodyShape) {
                    pointsArray[i++] = row.x1;
                    pointsArray[i++] = row.y;
                }
                bodyShape.reverse();
                for (const row of bodyShape) {
                    pointsArray[i++] = row.x0;
                    pointsArray[i++] = row.y;
                }
            }
            if (pointsArray.length) {
                const bezierPts = curveFit.fitCurveThroughPoints(pointsArray, 1.5);
                ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(bezierPts[0], bezierPts[1]);
                for (let i = 2; i < bezierPts.length; i += 6) {
                    ctx.bezierCurveTo(bezierPts[i], bezierPts[i + 1], bezierPts[i + 2], bezierPts[i + 3], bezierPts[i + 4], bezierPts[i + 5]);
                }
                ctx.stroke();
            }
            if (frameStats.thermalRef) {
                const thermalReference = frameStats.thermalRef;
                const ctx = analysisCanvas.getContext('2d');
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(thermalReference.geom.center.x, thermalReference.geom.center.y, thermalReference.geom.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            // If there's not enough weight above the threshold, move down until there is.
            drawBackgroundImage(backgroundCanvas, prevFrame, frameStats.heatStats.min, frameStats.heatStats.max);
            //<br>${seenBody && advanced.event ? `${(startTime/ 1000).toFixed(2)}s elapsed` : ''}<br>${advanced.event}<br>
            //         textState.innerHTML = `#${frameNumber}, ${screeningState}(${screeningStateCount})
            // Threshold ${(thermalRefC + (adjustedThreshold - thermalRefRaw) * 0.01).toFixed(2)}C&deg;
            // <br>Motion: ${frameInfo.motion}<br>Threshold: ${frameInfo.thresholded}<br>Both: ${frameInfo.motionPlusThreshold}<br>Bottom: ${frameInfo.actionInBottomHalf}`;
            // Write the screening state out to a text block.
        }
    }
    timings.sort();
    console.log("Min", timings[0], "Max", timings[timings.length - 1], "Median", timings[Math.floor(timings.length / 2)]);
}
