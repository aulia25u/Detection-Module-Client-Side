const video = document.getElementById("video");
let referenceDescriptor;

async function loadModels() {
  const modelPath =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
}

async function getReferenceImage(url) {
  const corsProxy = "https://cors-anywhere.herokuapp.com/";

  const img = await faceapi.fetchImage(url);
  const detections = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detections.descriptor;
}

async function processVideoFrames() {
  if (!referenceDescriptor) return;

  const threshold = 0.5;
  const thresholdElement = document.getElementById("threshold");
  thresholdElement.textContent = threshold + " / " + threshold * 100 + "%";

  const objectModel = await cocoSsd.load();

  const detectionInterval = 200; // Adjust this value to control detection frequency (in milliseconds)
  const minConfidence = 0.5; // Adjust this value to control detection accuracy (0 to 1)

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  video.srcObject = stream;
  video.addEventListener("loadeddata", () => {
    async function onResults() {
      const bestMatchElement = document.getElementById("best-match");
      const similarityPercentageElement = document.getElementById(
        "similarity-percentage"
      );
      const faceCountElement = document.getElementById("face-count");
      const faceLandmarksElement = document.getElementById("face-landmarks");

      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.SsdMobilenetv1Options({ minConfidence })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        console.log("No faces detected");
      } else {
        const faceMatcher = new faceapi.FaceMatcher(
          referenceDescriptor,
          threshold
        );
        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);

        const similarityPercentage = (1 - bestMatch.distance) * 100;

        bestMatchElement.textContent = bestMatch.toString();
        similarityPercentageElement.textContent = `${similarityPercentage.toFixed(
          2
        )}%`;

        // Resize video input
        const inputSize = 224;
        const resizedResults = faceapi.resizeResults(detections, {
          width: inputSize,
          height: inputSize,
        });

        faceCountElement.textContent = detections.length;

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
      }

      const objectDetections = await objectModel.detect(video);
      const detectedObjectsElement =
        document.getElementById("detected-objects");
      detectedObjectsElement.innerHTML = "";

      objectDetections.forEach((object) => {
        const p = document.createElement("p");
        p.textContent = `${object.class}: ${object.score.toFixed(2)}`;
        detectedObjectsElement.appendChild(p);
      });

      setTimeout(onResults, detectionInterval);
    }

    onResults();
  });
}

async function startVideo() {
  await loadModels();

  await navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
    });
}

const setReferenceImageBtn = document.getElementById("set-reference-image");
const referenceImageUrlInput = document.getElementById("reference-image-url");

setReferenceImageBtn.addEventListener("click", async () => {
  const imageUrl = referenceImageUrlInput.value;
  if (!imageUrl) {
    alert("Please enter a valid URL for the reference image.");
    return;
  }

  try {
    referenceDescriptor = await getReferenceImage(imageUrl);
    // Restart video to start processing frames after reference image is set
    processVideoFrames();
  } catch (error) {
    alert("Error loading reference image. Please check the URL and try again.");
    console.error(error);
  }
});

startVideo();
