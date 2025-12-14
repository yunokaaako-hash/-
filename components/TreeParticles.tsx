import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppState } from '../types';
import { COLORS, COUNTS, TREE_HEIGHT, TREE_RADIUS } from '../constants';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

interface ParticleData {
  positionTree: THREE.Vector3;
  positionExplode: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
}

export const TreeParticles: React.FC<{ appState: AppState }> = ({ appState }) => {
  const leavesRef = useRef<THREE.InstancedMesh>(null);
  const decorationRef = useRef<THREE.InstancedMesh>(null);
  const ribbonRef = useRef<THREE.InstancedMesh>(null);

  // --- Generate Data ---
  const generateParticles = (count: number, type: 'leaf' | 'deco' | 'ribbon') => {
    const data: ParticleData[] = [];
    for (let i = 0; i < count; i++) {
      // Tree Shape: Cone
      // y goes from -TREE_HEIGHT/2 to TREE_HEIGHT/2
      const yRatio = i / count; 
      
      let x, y, z;
      
      if (type === 'ribbon') {
        // Spiral
        const turns = 3.5;
        const angle = yRatio * Math.PI * 2 * turns;
        const radius = (1 - yRatio) * (TREE_RADIUS + 0.5); // Slightly outside tree
        y = (yRatio * TREE_HEIGHT) - (TREE_HEIGHT / 2);
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
      } else {
        // Random volume in cone
        const heightPercent = Math.random();
        y = (heightPercent * TREE_HEIGHT) - (TREE_HEIGHT / 2);
        const radiusAtHeight = (1 - heightPercent) * TREE_RADIUS;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radiusAtHeight; // Uniform distribution
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
        
        // Push decorations to the surface
        if (type === 'deco') {
           const surfaceR = radiusAtHeight * 0.9;
           x = Math.cos(angle) * surfaceR;
           z = Math.sin(angle) * surfaceR;
        }
      }

      // Explode Shape: Sphere/Chaos
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const explodeR = 15 + Math.random() * 10;
      const ex = explodeR * Math.cos(theta) * Math.sin(phi);
      const ey = explodeR * Math.sin(theta) * Math.sin(phi);
      const ez = explodeR * Math.cos(phi);

      data.push({
        positionTree: new THREE.Vector3(x, y, z),
        positionExplode: new THREE.Vector3(ex, ey, ez),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        scale: type === 'leaf' ? 0.3 + Math.random() * 0.3 : type === 'ribbon' ? 0.15 : 0.4
      });
    }
    return data;
  };

  const leavesData = useMemo(() => generateParticles(COUNTS.leaves, 'leaf'), []);
  const decoData = useMemo(() => generateParticles(COUNTS.decorations, 'deco'), []);
  const ribbonData = useMemo(() => generateParticles(COUNTS.ribbon, 'ribbon'), []);

  // --- Animation Loop ---
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const lerpFactor = 0.05; // Smooth transition speed

    const updateMesh = (ref: React.RefObject<THREE.InstancedMesh>, data: ParticleData[], spinSpeed: number) => {
      if (!ref.current) return;
      
      for (let i = 0; i < data.length; i++) {
        const p = data[i];
        
        // Target Position
        const target = appState === AppState.TREE ? p.positionTree : p.positionExplode;
        
        // Get current Matrix
        ref.current.getMatrixAt(i, tempObject.matrix);
        tempObject.matrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);
        
        // Lerp Position
        tempObject.position.lerp(target, lerpFactor);
        
        // Rotate in place
        tempObject.rotation.set(
            p.rotation.x + t * spinSpeed,
            p.rotation.y + t * spinSpeed,
            p.rotation.z
        );
        
        // Scale pulse
        const scalePulse = p.scale + Math.sin(t * 2 + i) * 0.05;
        tempObject.scale.setScalar(scalePulse);
        
        tempObject.updateMatrix();
        ref.current.setMatrixAt(i, tempObject.matrix);
      }
      ref.current.instanceMatrix.needsUpdate = true;
    };

    updateMesh(leavesRef, leavesData, 0.5);
    updateMesh(decorationRef, decoData, 0.2);
    updateMesh(ribbonRef, ribbonData, 0.1);
  });

  return (
    <>
      {/* Leaves - Octahedrons */}
      <instancedMesh ref={leavesRef} args={[undefined, undefined, COUNTS.leaves]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color={COLORS.secondary} 
          roughness={0.4} 
          metalness={0.6} 
        />
      </instancedMesh>

      {/* Decorations - Cubes/Icosahedrons */}
      <instancedMesh ref={decorationRef} args={[undefined, undefined, COUNTS.decorations]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial 
          color={COLORS.accent} 
          roughness={0} 
          metalness={0.9} 
          transmission={0.2}
          thickness={1}
        />
      </instancedMesh>

      {/* Ribbon - Tetrahedrons */}
      <instancedMesh ref={ribbonRef} args={[undefined, undefined, COUNTS.ribbon]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="white" 
          emissive="white" 
          emissiveIntensity={2} 
          toneMapped={false} 
        />
      </instancedMesh>
    </>
  );
};