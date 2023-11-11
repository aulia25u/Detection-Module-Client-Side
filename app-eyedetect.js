const video = document.getElementById("video");
const overlayCanvas = document.getElementById("overlay");
const overlayContext = overlayCanvas.getContext("2d");
const faceLandmarksElement = document.getElementById("face-landmarks");
const pupilHistoryCanvas = document.getElementById("pupil-history");
const pupilHistoryContext = pupilHistoryCanvas.getContext("2d");

const eyeHistory = {
  leftEye: [],
  rightEye: [],
};

function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

function getWebcamInfo() {
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    return tracks.map((track) => ({
      label: track.label,
      settings: track.getSettings(),
    }));
  }
  return [];
}

async function loadModels() {
  const modelPath =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
}

let trackingData = [];

function addTrackingData(leftEye, rightEye) {
  const currentTime = new Date().toISOString();
  trackingData.push({
    time: currentTime,
    leftEye: leftEye,
    rightEye: rightEye,
  });
}

let lastSaveTime = Date.now();

function shouldSaveData(currentCoordinates, lastCoordinates) {
  const movementThreshold = 5; // pixels
  const timeThreshold = 1000; // milliseconds
  const currentTime = Date.now();

  if (currentTime - lastSaveTime > timeThreshold) {
    // Check if lastCoordinates is defined
    if (lastCoordinates) {
      const distance = Math.sqrt(
        Math.pow(currentCoordinates.x - lastCoordinates.x, 2) +
          Math.pow(currentCoordinates.y - lastCoordinates.y, 2)
      );

      if (distance > movementThreshold) {
        lastSaveTime = currentTime;
        return true;
      }
    } else {
      // If lastCoordinates is not defined, allow saving the data
      return true;
    }
  }

  return false;
}

function saveTrackingData() {
  // Retrieve existing data from local storage
  const existingDataJSON = localStorage.getItem("trackingData");
  const existingData = existingDataJSON
    ? JSON.parse(existingDataJSON)
    : {
        browserInfo: getBrowserInfo(),
        webcamInfo: getWebcamInfo(),
        trackingData: [],
      };

  // Append new tracking data to existing data
  existingData.trackingData.push(...trackingData);

  // Save the updated data back to local storage
  localStorage.setItem("trackingData", JSON.stringify(existingData));

  // Optionally, you can clear the trackingData array here if you don't want it to grow indefinitely
  // trackingData = [];
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

function drawFaceBoundaries(detection) {
  const landmarks = detection.landmarks.positions;
  if (landmarks.length > 0) {
    overlayContext.beginPath();
    overlayContext.moveTo(landmarks[0]._x, landmarks[0]._y);
    landmarks.forEach((landmark, index) => {
      if (index > 0) {
        overlayContext.lineTo(landmark._x, landmark._y);
      }
    });
    overlayContext.closePath();
    overlayContext.strokeStyle = "green"; // Color for face boundary
    overlayContext.stroke();
  }
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

  const shouldSave =
    shouldSaveData(eyeCoordinates.leftEye, eyeHistory.leftEye.slice(-1)[0]) ||
    shouldSaveData(eyeCoordinates.rightEye, eyeHistory.rightEye.slice(-1)[0]);

  if (shouldSave) {
    addTrackingData(eyeCoordinates.leftEye, eyeCoordinates.rightEye);
  }
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

  overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  resizedResults.forEach((detection) => {
    const mappedLandmarks = {
      leftEye: detection.landmarks.getLeftEye(),
      rightEye: detection.landmarks.getRightEye(),
    };

    drawEyePosition(video, mappedLandmarks);
    displayEyePositions(mappedLandmarks);

    // Draw face boundaries
    drawFaceBoundaries(detection);

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

function downloadTrackingData() {
  const data = localStorage.getItem("trackingData");
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "pupil-tracking-data.json";
  a.click();

  URL.revokeObjectURL(url);
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

// Save data every second (1000 milliseconds)
setInterval(saveTrackingData, 1000);
