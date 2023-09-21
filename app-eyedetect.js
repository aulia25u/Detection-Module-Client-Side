const video = document.getElementById("video");
const faceCountElement = document.getElementById("face-count");
const faceLandmarksElement = document.getElementById("face-landmarks");
const overlayCanvas = document.getElementById("overlay");
const overlayContext = overlayCanvas.getContext('2d');

// Load face-api.js models
async function loadModels() {
  const modelPath = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
  await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
}

function mapLandmarkCoordinates(landmarks) {
  const mappedLandmarks = {};

  // Face landmark names
  const landmarkNames = ["leftEye", "rightEye"];

  // Starting and ending indices for each landmark
  const landmarkIndices = [
    [36, 41],
    [42, 47]
  ];

  landmarkNames.forEach((landmarkName, index) => {
    const [start, end] = landmarkIndices[index];
    mappedLandmarks[landmarkName] = landmarks.slice(start, end + 1);
  });

  return mappedLandmarks;
}

function drawEyePosition(mappedLandmarks) {
  overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  // Calculate and draw the center for each eye
  ["leftEye", "rightEye"].forEach((eye) => {
    const eyePositions = mappedLandmarks[eye];
    const x = eyePositions.reduce((sum, pos) => sum + pos._x, 0) / eyePositions.length;
    const y = eyePositions.reduce((sum, pos) => sum + pos._y, 0) / eyePositions.length;

    overlayContext.beginPath();
    overlayContext.arc(x, y, 5, 0, 2 * Math.PI);
    overlayContext.fillStyle = "red";
    overlayContext.fill();
    overlayContext.closePath();
  });
}

// Start webcam and process frames
async function startVideo() {
  await loadModels();

  await navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;

      video.addEventListener("play", async () => {
        const detectionInterval = 100; // Adjust this value to control detection frequency (in milliseconds)
        const minConfidence = 0.5; // Adjust this value to control detection accuracy (0 to 1)

        while (video.readyState === 4) {
          const detections = await faceapi
            .detectAllFaces(
              video,
              new faceapi.SsdMobilenetv1Options({ minConfidence })
            )
            .withFaceLandmarks();

          // Resize video input
          const inputSize = 224;
          const resizedResults = faceapi.resizeResults(detections, {
            width: inputSize,
            height: inputSize,
          });

          faceCountElement.textContent = resizedResults.length;
          resizedResults.forEach((detection) => {
            const mappedLandmarks = mapLandmarkCoordinates(detection.landmarks.positions);
            drawEyePosition(mappedLandmarks);
          });

          await new Promise((resolve) =>
            setTimeout(resolve, detectionInterval)
          );
        }
      });
    });
}

startVideo();
