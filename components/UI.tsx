import React from 'react';
import { AppState } from '../types';

interface UIProps {
  appState: AppState;
  cursorPos: { x: number; y: number };
}

export const UIOverlay: React.FC<UIProps> = ({ appState, cursorPos }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Title */}
      <div className="absolute top-8 left-8">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-200 animate-pulse tracking-widest drop-shadow-[0_0_10px_rgba(255,105,180,0.8)]">
          CYBER CHRISTMAS
        </h1>
        <p className="text-pink-200 mt-2 text-sm tracking-widest opacity-80">
          STATE: <span className="font-bold text-white">{appState}</span>
        </p>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 left-8 text-pink-100/70 text-sm space-y-2">
        <p><span className="text-white font-bold">✊ PINCH</span> to Assemble Tree</p>
        <p><span className="text-white font-bold">🖐 OPEN HAND</span> to Explode</p>
        <p><span className="text-white font-bold">👋 MOVE HAND</span> to Rotate</p>
        <p><span className="text-white font-bold">☝ POINT</span> to Move Cursor & Select Photos</p>
      </div>

      {/* Custom Cursor */}
      <div 
        className="fixed w-8 h-8 rounded-full border-2 border-white cursor-glow transition-transform duration-75 ease-out flex items-center justify-center mix-blend-difference"
        style={{ 
          left: `${cursorPos.x * 100}%`, 
          top: `${cursorPos.y * 100}%`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="w-1 h-1 bg-white rounded-full" />
      </div>
    </div>
  );
};