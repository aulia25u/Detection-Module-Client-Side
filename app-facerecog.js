const video = document.getElementById("video");
let referenceDescriptor;

// Load face-api.js models
async function loadModels() {
  const modelPath =
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
}

// Get reference image for face recognition
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

  const bestMatchElement = document.getElementById("best-match");
  const similarityPercentageElement = document.getElementById(
    "similarity-percentage"
  );
  const threshold = 0.5;
  const thresholdElement = document.getElementById("threshold");
  thresholdElement.textContent = threshold + " / " + threshold * 100 + "%";

  while (video.readyState === 4) {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
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

      // Calculate similarity percentage
      const similarityPercentage = (1 - bestMatch.distance) * 100;

      // Update HTML elements with results
      bestMatchElement.textContent = bestMatch.toString();
      similarityPercentageElement.textContent = `${similarityPercentage.toFixed(
        2
      )}%`;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Start webcam
async function startVideo() {
  await loadModels();

  await navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;

      video.addEventListener("play", () => {
        processVideoFrames();
      });
    });
}

// Set up button to set the reference image
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
