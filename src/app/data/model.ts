export interface GrayImageData {
  pixels: Uint8Array;
  nrows: number;
  ncols: number;
  ldim: number;
}

export interface EyeCoordinates {
  row: number;
  col: number;
  size: number;
}

export interface FaceDetection {
  row: number;
  col: number;
  size: number;
  confidence: number;
}
