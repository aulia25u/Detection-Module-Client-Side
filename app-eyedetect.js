const video = document.getElementById("video");
const overlayCanvas = document.getElementById("overlay");
const overlayContext = overlayCanvas.getContext("2d");
const faceCountElement = document.getElementById("face-count");
const faceLandmarksElement = document.getElementById("face-landmarks");

async function loadModels() {
    const modelPath = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    // Only load the models you need. If you aren't using face expressions, you can remove this line.
    // await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
}

function drawEyePosition(video, mappedLandmarks) {
    overlayContext.drawImage(video, 0, 0, overlayCanvas.width, overlayCanvas.height);
    ["leftEye", "rightEye"].forEach((eye) => {
        const eyePositions = mappedLandmarks[eye];
        overlayContext.beginPath();
        eyePositions.forEach((pos, idx) => {
            if (idx === 0) {
                overlayContext.moveTo(pos._x, pos._y);
            } else {
                overlayContext.lineTo(pos._x, pos._y);
            }
        });
        overlayContext.closePath();
        overlayContext.strokeStyle = "red";
        overlayContext.stroke();
    });
}


function displayEyePositions(mappedLandmarks) {
    const eyeCoordinates = {
        leftEye: null,
        rightEye: null
    };

    ["leftEye", "rightEye"].forEach(eye => {
        const positions = mappedLandmarks[eye];
        const x = positions.reduce((sum, pos) => sum + pos._x, 0) / positions.length;
        const y = positions.reduce((sum, pos) => sum + pos._y, 0) / positions.length;
        eyeCoordinates[eye] = { x, y };
    });

    faceLandmarksElement.innerHTML = `
        Left Eye: X: ${eyeCoordinates.leftEye.x.toFixed(2)}, Y: ${eyeCoordinates.leftEye.y.toFixed(2)}<br>
        Right Eye: X: ${eyeCoordinates.rightEye.x.toFixed(2)}, Y: ${eyeCoordinates.rightEye.y.toFixed(2)}
    `;
}

async function detectFaces() {
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();
    const resizedResults = faceapi.resizeResults(detections, {
        width: video.width,
        height: video.height
    });

    faceCountElement.textContent = resizedResults.length;

    resizedResults.forEach((detection) => {
        const mappedLandmarks = {
            leftEye: detection.landmarks.getLeftEye(),
            rightEye: detection.landmarks.getRightEye()
        };

        drawEyePosition(video, mappedLandmarks);
        displayEyePositions(mappedLandmarks);
    });

    requestAnimationFrame(detectFaces);
}

async function startVideo() {
    await loadModels();

    await navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
            video.srcObject = stream;
            video.onloadedmetadata = function() {
                video.play();
                detectFaces(); // Start detecting once video is played
            };
        });
}

startVideo();
