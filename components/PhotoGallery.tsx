import React, { useState, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';
import { COLORS, TREE_HEIGHT, TREE_RADIUS } from '../constants';
import { Html } from '@react-three/drei';

interface FrameProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  appState: AppState;
  id: number;
  cursorPos: { x: number; y: number };
}

const PhotoFrame: React.FC<FrameProps> = ({ position, rotation, appState, id, cursorPos }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const { camera, size, raycaster, scene } = useThree();
  const inputRef = useRef<HTMLInputElement>(null);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  // Raycasting for "Cursor" logic (Finger pointing)
  useFrame(() => {
    if (!meshRef.current) return;
    
    // Convert 0-1 cursor to -1 to 1 normalized device coords
    const ndcX = (cursorPos.x * 2) - 1;
    const ndcY = -(cursorPos.y * 2) + 1;
    
    // Very basic dwell detection could go here, but strictly relying on visual feedback + click
    // Scaling effect when cursor is close could be nice
    // Note: Accurate raycasting from "Hand Cursor" requires casting from camera using NDC
    // This is handled globally or we just check distance if we project the mesh position.
  });

  useFrame((state) => {
    if (!meshRef.current) return;

    const targetPos = new THREE.Vector3();
    const targetRot = new THREE.Euler();
    const targetScale = new THREE.Vector3();

    if (isActive) {
      // Zoom to front of camera
      // We position it relative to the camera
      const vec = new THREE.Vector3(0, 0, -10); // 10 units in front of camera
      vec.applyQuaternion(camera.quaternion);
      targetPos.copy(camera.position).add(vec);
      
      // Look at camera
      targetRot.copy(camera.rotation);
      
      // Scale to approx 1/6th screen (heuristic based on FOV/Distance)
      // At dist 10, height of view is approx 8. 1/6th is ~1.5 height
      targetScale.setScalar(3); 
    } else {
      // Normal Tree/Explode Position
      if (appState === AppState.TREE) {
        targetPos.copy(position);
        targetRot.copy(rotation);
      } else {
        // Exploded: Push outwards
        targetPos.copy(position).multiplyScalar(2.5);
        targetRot.set(rotation.x + state.clock.elapsedTime, rotation.y, rotation.z);
      }
      targetScale.setScalar(1);
    }

    meshRef.current.position.lerp(targetPos, 0.1);
    // Quaternion slerp would be better but Euler lerp is okay for small deltas
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRot.x, 0.1);
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRot.y, 0.1);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRot.z, 0.1);
    
    meshRef.current.scale.lerp(targetScale, 0.1);
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (isActive) {
      // Click again (or outside) to close - logic handled by "click non-frame" in global, 
      // but here we can toggle off if clicked directly.
      // Actually prompt says "Click non-frame area to restore".
      // But clicking the frame itself when active? Let's just keep it active.
      return; 
    }

    if (!image) {
      inputRef.current?.click();
    } else {
      setIsActive(true);
    }
  };

  // Listen to global clicks to dismiss? 
  // We'll use a simple "useEffect" to listen to window clicks to dismiss if not clicking this
  React.useEffect(() => {
    const dismiss = (e: MouseEvent) => {
      if (isActive && meshRef.current) {
        // Simple check: This is a DOM click. 
        // In R3F, raycaster events handle the 3D click. 
        // We rely on the Canvas 'onPointerMissed' to set isActive(false) globally?
        // Let's handle it locally via a prop or simple hack:
        // If the user clicks ANYWHERE and we are active, we might want to check if they hit us.
        // For simplicity: We add a 'onPointerMissed' to the Canvas in App.tsx to reset focused frames.
      }
    };
    window.addEventListener('click', dismiss);
    return () => window.removeEventListener('click', dismiss);
  }, [isActive]);
  
  // Actually, standard R3F way: use onPointerMissed on parent or self logic
  useFrame(() => {
      // Just a hook to ensure re-render
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setImage(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <group ref={meshRef} onClick={handleClick} 
        onPointerMissed={(e) => isActive && setIsActive(false)}>
      
      {/* Hidden File Input */}
      <Html>
        <input 
          type="file" 
          accept="image/*" 
          ref={inputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
      </Html>

      {/* Frame Border */}
      <mesh>
        <boxGeometry args={[1.2, 1.5, 0.1]} />
        <meshStandardMaterial color={COLORS.gold} metalness={1} roughness={0.1} />
      </mesh>

      {/* Photo Area / Placeholder */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1, 1.3]} />
        {image ? (
            <meshBasicMaterial map={textureLoader.load(image)} toneMapped={false} />
        ) : (
            <meshStandardMaterial 
                color={COLORS.secondary} 
                emissive={COLORS.primary}
                emissiveIntensity={0.5}
            />
        )}
      </mesh>
    </group>
  );
};

export const PhotoGallery: React.FC<{ appState: AppState, cursorPos: {x:number, y:number} }> = ({ appState, cursorPos }) => {
  const frames = useMemo(() => {
    const items = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // Spiral down slightly or random
      const y = ((i / count) * TREE_HEIGHT * 0.8) - (TREE_HEIGHT / 2) + 2; 
      const r = ((1 - (i/count)) * TREE_RADIUS) + 1.5; // Slightly outside leaves
      
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      
      const pos = new THREE.Vector3(x, y, z);
      const rot = new THREE.Euler(0, -angle + Math.PI / 2, 0); // Face outward
      
      items.push({ pos, rot, id: i });
    }
    return items;
  }, []);

  return (
    <group>
      {frames.map((f) => (
        <PhotoFrame 
            key={f.id} 
            id={f.id} 
            position={f.pos} 
            rotation={f.rot} 
            appState={appState}
            cursorPos={cursorPos}
        />
      ))}
    </group>
  );
};