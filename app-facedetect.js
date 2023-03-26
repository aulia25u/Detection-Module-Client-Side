const video = document.getElementById("video");
const faceCountElement = document.getElementById("face-count");
const faceLandmarksElement = document.getElementById("face-landmarks");

// Load face-api.js models
async function loadModels() {
  const modelPath =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
  await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
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

          let landmarksText = "";
          resizedResults.forEach((detection, index) => {
            landmarksText += `Face ${index + 1} coordinates: ${JSON.stringify(
              detection.landmarks.positions
            )}\n`;

            // Eye coordinates
            const leftEye = detection.landmarks.getLeftEye();
            const rightEye = detection.landmarks.getRightEye();
            landmarksText += `Face ${
              index + 1
            } left eye coordinates: ${JSON.stringify(leftEye)}\n`;
            landmarksText += `Face ${
              index + 1
            } right eye coordinates: ${JSON.stringify(rightEye)}\n`;
          });
          faceLandmarksElement.textContent = landmarksText;

          await new Promise((resolve) =>
            setTimeout(resolve, detectionInterval)
          );
        }
      });
    });
}

startVideo();