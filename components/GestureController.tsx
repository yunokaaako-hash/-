import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureState } from '../types';

interface GestureControllerProps {
  onGestureUpdate: (state: GestureState) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onGestureUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const previousPalmX = useRef<number | null>(null);

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setLoaded(true);
      startCamera();
    };

    initMediaPipe();
    return () => {
      if(requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: "user" } 
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictWebcam);
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;
    
    const nowInMs = Date.now();
    const results = handLandmarkerRef.current.detectForVideo(videoRef.current, nowInMs);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks = results.landmarks[0];
      
      // 1. Detect Pinch (Thumb Tip vs Index Tip distance)
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const isPinching = pinchDist < 0.05;

      // 2. Detect Open Palm (Fingers extended)
      // Simple check: Tips are above (y lower than) PIP joints
      const isTipAbovePip = (tipIdx: number, pipIdx: number) => landmarks[tipIdx].y < landmarks[pipIdx].y;
      // Only useful if hand is upright. Better metric: Spread calculation or bounding box ratio.
      // Let's use simple logic: If not pinching and fingers are somewhat spread.
      // Actually, checking if all fingers are extended:
      const fingersExtended = [8, 12, 16, 20].every(tip => landmarks[tip].y < landmarks[tip - 2].y); // Tip vs PIP
      const isOpenPalm = fingersExtended && !isPinching;

      // 3. Detect Pointing (Index extended, others curled)
      const indexExtended = landmarks[8].y < landmarks[6].y;
      const middleCurled = landmarks[12].y > landmarks[10].y;
      const ringCurled = landmarks[16].y > landmarks[14].y;
      const pinkyCurled = landmarks[20].y > landmarks[18].y;
      const isPointing = indexExtended && middleCurled && ringCurled && pinkyCurled;

      // 4. Movement (Rotation)
      // Use Palm Center (index 0 or 9) x-coordinate
      const palmX = landmarks[9].x;
      let rotationDelta = 0;
      if (isOpenPalm && previousPalmX.current !== null) {
        rotationDelta = palmX - previousPalmX.current;
      }
      previousPalmX.current = palmX;

      // 5. Cursor Position (Index Tip)
      // Mirror X for intuitive control
      const cursorX = 1 - indexTip.x; 
      const cursorY = indexTip.y;

      onGestureUpdate({
        isPinching,
        isOpenPalm,
        isPointing,
        handPosition: { x: cursorX, y: cursorY },
        rotationDelta
      });
    } else {
        previousPalmX.current = null;
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  return (
    <div className="absolute bottom-4 right-4 w-48 h-36 border-2 border-pink-500 rounded-lg overflow-hidden bg-black shadow-[0_0_20px_rgba(255,105,180,0.5)] z-50">
       <video 
         ref={videoRef} 
         autoPlay 
         playsInline
         muted
         className="w-full h-full object-cover transform -scale-x-100 opacity-80"
       />
       {!loaded && <div className="absolute inset-0 flex items-center justify-center text-pink-300 text-xs">Loading AI...</div>}
       <div className="absolute top-1 left-2 text-[10px] text-white bg-black/50 px-1 rounded">
          Hand Tracking
       </div>
    </div>
  );
};