const video = document.getElementById("video");

// Start webcam and process frames
async function startVideo() {
  // Load the coco-ssd model
  const objectModel = await cocoSsd.load();

  await navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", () => {
        async function onResults() {
          // Object detection
          const objectDetections = await objectModel.detect(video);
          updateDetectedObjects(objectDetections);

          // Request the next frame with a 1000ms delay
          setTimeout(() => {
            requestAnimationFrame(onResults);
          }, 1000);
        }

        // Start processing
        onResults();
      });
    });
}

function updateDetectedObjects(objectDetections) {
  const detectedObjectsElement = document.getElementById("detected-objects");
  detectedObjectsElement.innerHTML = "";

  objectDetections.forEach((object) => {
    const p = document.createElement("p");
    p.textContent = `${object.class}: ${object.score.toFixed(2)}`;
    detectedObjectsElement.appendChild(p);
  });
}

startVideo();
