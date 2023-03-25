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
  const img = await faceapi.fetchImage(corsProxy + url);
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
        .detectAllFaces(video)
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
        faceCountElement.textContent = detections.length;

        let landmarksText = "";
        detections.forEach((detection, index) => {
          landmarksText += `Face ${index + 1} coordinates: ${JSON.stringify(
            detection.landmarks.positions
          )}\n`;
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

      requestAnimationFrame(onResults);
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
