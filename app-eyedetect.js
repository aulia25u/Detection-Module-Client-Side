const video = document.getElementById("video");
const overlayCanvas = document.getElementById("overlay");
const overlayContext = overlayCanvas.getContext("2d");
const faceLandmarksElement = document.getElementById("face-landmarks");
const pupilHistoryCanvas = document.getElementById("pupil-history");
const pupilHistoryContext = pupilHistoryCanvas.getContext("2d");
const eyeOnlyCanvas = document.getElementById("eye_only");
const eyeOnlyContext = eyeOnlyCanvas.getContext("2d");

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

    const centerX =
      eyePositions.reduce((sum, pos) => sum + pos._x, 0) / eyePositions.length;
    const centerY =
      eyePositions.reduce((sum, pos) => sum + pos._y, 0) / eyePositions.length;
    overlayContext.beginPath();
    overlayContext.arc(centerX, centerY, 2 * 1.2, 0, 2 * Math.PI); // Increase the radius by 20%
    overlayContext.fillStyle = "blue";
    overlayContext.fill();
  });
}

function drawEyeOnly(video, eyePositions) {
  const leftEyePositions = eyePositions.leftEye;
  const rightEyePositions = eyePositions.rightEye;

  // Dapatkan titik-titik ekstrim dari kedua mata
  const allEyeXs = [...leftEyePositions, ...rightEyePositions].map(
    (pos) => pos._x
  );
  const allEyeYs = [...leftEyePositions, ...rightEyePositions].map(
    (pos) => pos._y
  );

  const startX = Math.min(...allEyeXs) - 10; // Tambahkan margin jika diperlukan
  const endX = Math.max(...allEyeXs) + 10;
  const startY = Math.min(...allEyeYs) - 10;
  const endY = Math.max(...allEyeYs) + 10;

  // Lakukan cropping dan tampilkan pada canvas "eye_only"
  eyeOnlyContext.drawImage(
    video,
    startX,
    startY,
    endX - startX,
    endY - startY,
    0,
    0,
    eyeOnlyCanvas.width,
    eyeOnlyCanvas.height
  );
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
    Left Eye (Pupil): X: ${eyeCoordinates.leftEye.x.toFixed(
      2
    )}, Y: ${eyeCoordinates.leftEye.y.toFixed(2)}<br>
    Right Eye (Pupil): X: ${eyeCoordinates.rightEye.x.toFixed(
      2
    )}, Y: ${eyeCoordinates.rightEye.y.toFixed(2)}
  `;
}

function drawPupilHistory() {
  pupilHistoryContext.clearRect(
    0,
    0,
    pupilHistoryCanvas.width,
    pupilHistoryCanvas.height
  );

  pupilHistoryContext.beginPath();
  pupilHistoryContext.arc(
    pupilHistoryCanvas.width / 2,
    pupilHistoryCanvas.height / 2,
    50,
    0,
    2 * Math.PI
  );
  pupilHistoryContext.moveTo(
    pupilHistoryCanvas.width / 2,
    pupilHistoryCanvas.height / 2 - 50
  );
  pupilHistoryContext.lineTo(
    pupilHistoryCanvas.width / 2,
    pupilHistoryCanvas.height / 2 + 50
  );
  pupilHistoryContext.moveTo(
    pupilHistoryCanvas.width / 2 - 50,
    pupilHistoryCanvas.height / 2
  );
  pupilHistoryContext.lineTo(
    pupilHistoryCanvas.width / 2 + 50,
    pupilHistoryCanvas.height / 2
  );
  pupilHistoryContext.stroke();

  ["leftEye", "rightEye"].forEach((eye) => {
    eyeHistory[eye].forEach((pos, index) => {
      pupilHistoryContext.beginPath();
      pupilHistoryContext.arc(pos.x, pos.y, 2 * 1.2, 0, 2 * Math.PI);
      pupilHistoryContext.fillStyle = "red";
      pupilHistoryContext.fill();
      if (index > 0) {
        pupilHistoryContext.beginPath();
        pupilHistoryContext.moveTo(
          eyeHistory[eye][index - 1].x,
          eyeHistory[eye][index - 1].y
        );
        pupilHistoryContext.lineTo(pos.x, pos.y);
        pupilHistoryContext.strokeStyle = "red";
        pupilHistoryContext.stroke();
      }
    });
  });
}

async function detectFaces() {
  const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();
  const resizedResults = faceapi.resizeResults(detections, {
    width: video.width,
    height: video.height,
  });

  resizedResults.forEach((detection) => {
    const mappedLandmarks = {
      leftEye: detection.landmarks.getLeftEye(),
      rightEye: detection.landmarks.getRightEye(),
    };

    drawEyePosition(video, mappedLandmarks);
    displayEyePositions(mappedLandmarks);
    drawEyeOnly(video, mappedLandmarks);

    ["leftEye", "rightEye"].forEach((eye) => {
      const positions = mappedLandmarks[eye];
      const x =
        positions.reduce((sum, pos) => sum + pos._x, 0) / positions.length;
      const y =
        positions.reduce((sum, pos) => sum + pos._y, 0) / positions.length;
      eyeHistory[eye].push({ x, y });
      if (eyeHistory[eye].length > 50) eyeHistory[eye].shift();
    });

    drawPupilHistory();
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
        detectFaces();
      };
    });
}

startVideo();
