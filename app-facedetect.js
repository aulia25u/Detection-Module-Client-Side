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

function mapLandmarkCoordinates(landmarks) {
  const mappedLandmarks = {};

  // Face landmark names
  const landmarkNames = [
    "jawline",
    "leftEyebrow",
    "rightEyebrow",
    "nose",
    "leftEye",
    "rightEye",
    "outerLip",
    "innerLip",
  ];

  // Starting and ending indices for each landmark
  const landmarkIndices = [
    [0, 16],
    [17, 21],
    [22, 26],
    [27, 35],
    [36, 41],
    [42, 47],
    [48, 59],
    [60, 67],
  ];

  landmarkNames.forEach((landmarkName, index) => {
    const [start, end] = landmarkIndices[index];
    mappedLandmarks[landmarkName] = landmarks.slice(start, end + 1);
  });

  return mappedLandmarks;
}

function createTable(mappedLandmarks) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headerRow = document.createElement("tr");
  for (const landmarkName of Object.keys(mappedLandmarks)) {
    const th = document.createElement("th");
    th.textContent = landmarkName;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);

  const bodyRow = document.createElement("tr");
  for (const coordinates of Object.values(mappedLandmarks)) {
    const td = document.createElement("td");
    td.textContent = JSON.stringify(coordinates, null, 2);
    bodyRow.appendChild(td);
  }
  tbody.appendChild(bodyRow);

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
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

          faceLandmarksElement.innerHTML = ""; // Clear previous data
          resizedResults.forEach((detection, index) => {
            const mappedLandmarks = mapLandmarkCoordinates(
              detection.landmarks.positions
            );

            const table = createTable(mappedLandmarks);
            const faceTitle = document.createElement("p");
            faceTitle.textContent = `Face ${index + 1} coordinates:`;

            faceLandmarksElement.appendChild(faceTitle);
            faceLandmarksElement.appendChild(table);
          });

          await new Promise((resolve) =>
            setTimeout(resolve, detectionInterval)
          );
        }
      });
    });
}

startVideo();
