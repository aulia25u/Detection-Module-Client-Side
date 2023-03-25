const video = document.getElementById("video");
const faceCountElement = document.getElementById("face-count");
const faceLandmarksElement = document.getElementById("face-landmarks");

// Load face-api.js models
async function loadModels() {
  const modelPath =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
}

// Start webcam and process frames
async function startVideo() {
  await loadModels();

  await navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;

      video.addEventListener("play", async () => {
        while (video.readyState === 4) {
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
            .withFaceLandmarks();

          faceCountElement.textContent = detections.length;

          let landmarksText = "";
          detections.forEach((detection, index) => {
            landmarksText += `Face ${index + 1} coordinates: ${JSON.stringify(
              detection.landmarks.positions
            )}\n`;
          });
          faceLandmarksElement.textContent = landmarksText;

          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      });
    });
}

startVideo();
