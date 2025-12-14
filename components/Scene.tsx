import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Group } from 'three';
import * as THREE from 'three';
import { TreeParticles } from './TreeParticles';
import { PhotoGallery } from './PhotoGallery';
import { AppState } from '../types';
import { COLORS } from '../constants';

interface SceneProps {
  appState: AppState;
  sceneRotation: number;
  cursorPos: { x: number; y: number };
}

export const Scene: React.FC<SceneProps> = ({ appState, sceneRotation, cursorPos }) => {
  const groupRef = useRef<Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Continuous slow rotation + Hand gesture rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        sceneRotation + state.clock.getElapsedTime() * 0.1, 
        0.1
      );
    }
  });

  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      
      <ambientLight intensity={0.2} color={COLORS.primary} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={COLORS.accent} />
      <pointLight position={[-10, -5, 5]} intensity={1} color="#ffffff" />
      <spotLight position={[0, 20, 0]} intensity={2} angle={0.5} penumbra={1} color={COLORS.primary} />

      <group ref={groupRef}>
        <TreeParticles appState={appState} />
        <PhotoGallery appState={appState} cursorPos={cursorPos} />
        <StarTopper appState={appState} />
      </group>

      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.8} // Only very bright things glow
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

const StarTopper = ({ appState }: { appState: AppState }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = time;
      meshRef.current.rotation.z = Math.sin(time * 2) * 0.1;
      
      const targetY = appState === AppState.TREE ? 9.5 : 12; // Fly up when exploded
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.05);
    }
    if (glowRef.current) {
        glowRef.current.scale.setScalar(1.2 + Math.sin(time * 5) * 0.2);
    }
  });

  return (
    <group position={[0, 9.5, 0]}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0, 1.5, 0.2, 5]} /> {/* Simplified 5-point star-like shape */}
        <meshStandardMaterial 
            color={COLORS.gold} 
            emissive={COLORS.gold}
            emissiveIntensity={2}
            toneMapped={false}
        />
      </mesh>
      {/* Glow Halo */}
      <mesh ref={glowRef}>
         <sphereGeometry args={[1, 16, 16]} />
         <meshBasicMaterial color={COLORS.primary} transparent opacity={0.2} />
      </mesh>
    </group>
  );
};