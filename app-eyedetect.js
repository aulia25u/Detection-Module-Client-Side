const video = document.getElementById("video");
const overlayCanvas = document.getElementById("overlay");
const overlayContext = overlayCanvas.getContext("2d");
const eyeHistoryCanvas = document.getElementById("eyeHistory");
const eyeHistoryContext = eyeHistoryCanvas.getContext("2d");
const faceLandmarksElement = document.getElementById("face-landmarks");

const eyeHistory = {
  leftEye: [],
  rightEye: [],
};

async function loadModels() {
  const modelPath =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
}

function drawEyeHistory() {
  eyeHistoryContext.clearRect(
    0,
    0,
    eyeHistoryCanvas.width,
    eyeHistoryCanvas.height
  );

  // Draw the circle
  eyeHistoryContext.beginPath();
  eyeHistoryContext.arc(100, 100, 100, 0, 2 * Math.PI);
  eyeHistoryContext.stroke();

  // Draw cross in the middle
  eyeHistoryContext.beginPath();
  eyeHistoryContext.moveTo(100, 0);
  eyeHistoryContext.lineTo(100, 200);
  eyeHistoryContext.moveTo(0, 100);
  eyeHistoryContext.lineTo(200, 100);
  eyeHistoryContext.stroke();

  ["leftEye", "rightEye"].forEach((eye, idx) => {
    const color = idx === 0 ? "red" : "blue";

    if (eyeHistory[eye].length > 0) {
      // Draw history line
      eyeHistoryContext.beginPath();
      eyeHistoryContext.moveTo(eyeHistory[eye][0].x, eyeHistory[eye][0].y);
      eyeHistory[eye].forEach((pos) => {
        eyeHistoryContext.lineTo(pos.x, pos.y);
      });
      eyeHistoryContext.strokeStyle = color;
      eyeHistoryContext.stroke();

      // Draw current position
      const currentPosition = eyeHistory[eye][eyeHistory[eye].length - 1];
      eyeHistoryContext.beginPath();
      eyeHistoryContext.arc(
        currentPosition.x,
        currentPosition.y,
        3,
        0,
        2 * Math.PI
      );
      eyeHistoryContext.fillStyle = color;
      eyeHistoryContext.fill();
    }
  });
}

function drawEyePosition(video, mappedLandmarks) {
  overlayContext.drawImage(
    video,
    0,
    0,
    overlayCanvas.width,
    overlayCanvas.height
  );

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

  // Update eye history and draw on the eyeHistoryCanvas
  ["leftEye", "rightEye"].forEach((eye) => {
    const positions = mappedLandmarks[eye];
    const x =
      positions.reduce((sum, pos) => sum + pos._x, 0) / positions.length - 100;
    const y =
      positions.reduce((sum, pos) => sum + pos._y, 0) / positions.length - 100;
    eyeHistory[eye].push({ x, y });
    if (eyeHistory[eye].length > 50) eyeHistory[eye].shift(); // Keep the last 50 positions
  });

  drawEyeHistory();
}

function displayEyePositions(mappedLandmarks) {
  const eyeCoordinates = {
    leftEye: null,
    rightEye: null,
  };

  ["leftEye", "rightEye"].forEach((eye) => {
    const positions = mappedLandmarks[eye];
    const x =
      positions.reduce((sum, pos) => sum + pos._x, 0) / positions.length;
    const y =
      positions.reduce((sum, pos) => sum + pos._y, 0) / positions.length;
    eyeCoordinates[eye] = { x, y };
  });

  faceLandmarksElement.innerHTML = `
        Left Eye: X: ${eyeCoordinates.leftEye.x.toFixed(
          2
        )}, Y: ${eyeCoordinates.leftEye.y.toFixed(2)}<br>
        Right Eye: X: ${eyeCoordinates.rightEye.x.toFixed(
          2
        )}, Y: ${eyeCoordinates.rightEye.y.toFixed(2)}
    `;
}

async function detectFaces() {
  const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();
  const resizedResults = faceapi.resizeResults(detections, {
    width: video.width,
    height: video.height,
  });

  faceLandmarksElement.textContent = resizedResults.length;

  resizedResults.forEach((detection) => {
    const mappedLandmarks = {
      leftEye: detection.landmarks.getLeftEye(),
      rightEye: detection.landmarks.getRightEye(),
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
      video.onloadedmetadata = function () {
        video.play();
        detectFaces(); // Start detecting once video is played
      };
    });
}

startVideo();
