import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './components/Scene';
import { UIOverlay } from './components/UI';
import { GestureController } from './components/GestureController';
import { AppState, GestureState } from './types';
import { Loader } from '@react-three/drei';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.TREE);
  const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
  const [sceneRotation, setSceneRotation] = useState(0);
  
  // Ref to track rotation for manual updates
  const rotationRef = useRef(0);

  const toggleState = useCallback(() => {
    setAppState(prev => prev === AppState.TREE ? AppState.EXPLODE : AppState.TREE);
  }, []);

  const handleGestureUpdate = useCallback((gesture: GestureState) => {
    // State machine based on gestures
    if (gesture.isPinching) {
      setAppState(AppState.TREE);
    } else if (gesture.isOpenPalm && !gesture.rotationDelta) {
      setAppState(AppState.EXPLODE);
    }
    
    // Rotation logic
    if (gesture.isOpenPalm && Math.abs(gesture.rotationDelta) > 0.005) {
       rotationRef.current += gesture.rotationDelta * 5; // Sensitivity
       setSceneRotation(rotationRef.current);
    }

    // Cursor tracking
    if (gesture.isPointing || gesture.isOpenPalm) {
      setCursorPos(gesture.handPosition);
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050103] text-white">
      <Canvas
        camera={{ position: [0, 0, 25], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false }}
        onClick={toggleState}
      >
        <Scene 
          appState={appState} 
          sceneRotation={sceneRotation}
          cursorPos={cursorPos}
        />
      </Canvas>
      
      <Loader />
      
      <UIOverlay 
        appState={appState} 
        cursorPos={cursorPos}
      />
      
      <GestureController onGestureUpdate={handleGestureUpdate} />
    </div>
  );
}