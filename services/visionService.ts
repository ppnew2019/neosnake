import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { Direction } from "../types";

let handLandmarker: HandLandmarker | null = null;
let lastVideoTime = -1;

export const initializeVision = async () => {
  if (handLandmarker) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
  });
};

export const detectGesture = (video: HTMLVideoElement): Direction | null => {
  if (!handLandmarker || video.currentTime === lastVideoTime) return null;

  lastVideoTime = video.currentTime;
  const startTimeMs = performance.now();
  
  const results = handLandmarker.detectForVideo(video, startTimeMs);

  if (results.landmarks && results.landmarks.length > 0) {
    const landmarks = results.landmarks[0];
    
    // Improved Logic: Relative Movement (Wrist vs Index Tip)
    // 0: Wrist, 8: Index Finger Tip
    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    // Calculate delta vector
    const deltaX = indexTip.x - wrist.x;
    const deltaY = indexTip.y - wrist.y;

    // Thresholds for sensitivity (Lower = Faster/More Sensitive)
    // Normalized coordinates [0,1]
    const SENSITIVITY = 0.08; 

    // Determine primary axis of movement
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal Movement
      if (Math.abs(deltaX) > SENSITIVITY) {
        // NOTE: Webcam is usually mirrored visually to the user.
        // If user moves hand to THEIR right:
        // - In reality, they move right.
        // - In camera sensor (unmirrored), image moves left (X decreases).
        // - But most webcams output mirrored streams or CSS mirrors it.
        //
        // Let's rely on standard logic:
        // User points RIGHT (their right) -> Tip is to the right of Wrist physically.
        // In unmirrored camera frame: Tip is LEFT of Wrist (x decreases). 
        // So deltaX is negative.
        //
        // User points LEFT (their left) -> Tip is to the left of Wrist physically.
        // In unmirrored camera frame: Tip is RIGHT of Wrist (x increases).
        // So deltaX is positive.
        
        return deltaX < -SENSITIVITY ? Direction.RIGHT : Direction.LEFT;
      }
    } else {
      // Vertical Movement
      if (Math.abs(deltaY) > SENSITIVITY) {
        // Y increases downwards in screen coordinates.
        // Pointing UP: Tip is above Wrist (y decreases). DeltaY is negative.
        // Pointing DOWN: Tip is below Wrist (y increases). DeltaY is positive.
        return deltaY < -SENSITIVITY ? Direction.UP : Direction.DOWN;
      }
    }
  }

  return null;
};