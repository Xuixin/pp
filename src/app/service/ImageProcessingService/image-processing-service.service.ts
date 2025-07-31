import { Injectable } from '@angular/core';
import { GrayImageData } from 'src/app/data/model';

@Injectable({
  providedIn: 'root',
})
export class ImageProcessingService {
  private grayPixels?: Uint8Array;

  extractGrayscaleImageData(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): GrayImageData {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return this.convertToGrayscale(imageData);
  }

  private convertToGrayscale(imageData: ImageData): GrayImageData {
    const { width, height, data } = imageData;
    if (!this.grayPixels || this.grayPixels.length !== width * height) {
      this.grayPixels = new Uint8Array(width * height);
    }

    // Use weighted grayscale conversion formula
    for (let i = 0; i < this.grayPixels.length; i++) {
      const pixelIndex = i * 4;
      const red = data[pixelIndex];
      const green = data[pixelIndex + 1];
      const blue = data[pixelIndex + 2];

      // Weighted formula: (2*R + 7*G + 1*B) / 10
      this.grayPixels[i] = Math.round((2 * red + 7 * green + 1 * blue) / 10);
    }

    return {
      pixels: this.grayPixels,
      nrows: height,
      ncols: width,
      ldim: width,
    };
  }

  captureFaces(canvas: HTMLCanvasElement, faces: any[]): string[] {
    const context = canvas.getContext('2d');
    if (!context || faces.length === 0) return [];

    const [row, col, size] = faces[0]; // ใช้แค่ใบหน้าแรก
    const radius = size / 2;
    const x = Math.max(0, col - radius);
    const y = Math.max(0, row - radius);
    const width = Math.min(size, canvas.width - x);
    const height = Math.min(size, canvas.height - y);

    const cropped = context.getImageData(x, y, width, height);
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d')!;
    offCtx.putImageData(cropped, 0, 0);

    const dataUrl = offCanvas.toDataURL('image/png');
    return [dataUrl];
  }

  cleanup(): void {
    this.grayPixels = undefined;
  }
}
