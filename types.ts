export enum AppState {
  TREE = 'TREE',
  EXPLODE = 'EXPLODE'
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureState {
  isPinching: boolean;
  isOpenPalm: boolean;
  isPointing: boolean;
  handPosition: { x: number; y: number }; // Normalized 0-1
  rotationDelta: number;
}
