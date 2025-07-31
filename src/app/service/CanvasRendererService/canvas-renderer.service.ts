import { Injectable } from '@angular/core';
import { Constants } from 'src/app/data/constants';
import { GrayImageData, EyeCoordinates } from 'src/app/data/model';
import { PupilDetectionService } from '../PupilDetectionService/pupil-detection-service.service';

@Injectable({
  providedIn: 'root',
})
export class CanvasRendererService {
  private constants = new Constants();

  constructor(private pupilDetectionService: PupilDetectionService) {}

  clearAndDrawMirroredVideo(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement
  ): void {
    const { width, height } = canvas;

    context.clearRect(0, 0, width, height);

    // Draw mirrored video
    context.save();
    context.scale(-1, 1);
    context.drawImage(video, -width, 0, width, height);
    context.restore();
  }

  renderDetectionResults(
    context: CanvasRenderingContext2D,
    faces: any[],
    grayImageData: GrayImageData,
    canvas: HTMLCanvasElement
  ): void {
    this.setupRenderingStyle(context);

    for (const face of faces) {
      if (this.isFaceDetectionValid(face)) {
        this.renderSingleFaceDetection(context, face, grayImageData, canvas);
      }
    }
  }

  private setupRenderingStyle(context: CanvasRenderingContext2D): void {
    context.lineWidth = 3;
    context.strokeStyle = 'red';
    context.font = '14px Arial';
    context.fillStyle = 'red';
  }

  private isFaceDetectionValid(face: any[]): boolean {
    return face[3] > this.constants.MIN_FACE_SIZE;
  }

  private renderSingleFaceDetection(
    context: CanvasRenderingContext2D,
    face: any[],
    grayImageData: GrayImageData,
    canvas: HTMLCanvasElement
  ): void {
    const [row, col, size] = face;

    this.drawFaceCircle(context, col, row, size);
    this.drawFaceInformation(context, col, row, size);
    this.detectAndRenderPupils(context, row, col, size, grayImageData, canvas);
  }

  private drawFaceCircle(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number
  ): void {
    context.beginPath();
    context.arc(centerX, centerY, size / 2, 0, 2 * Math.PI);
    context.lineWidth = 2;
    context.strokeStyle = 'red';
    context.stroke();
  }

  private drawFaceInformation(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number
  ): void {
    const sizeText = `Size: ${Math.round(size)} px`;
    const positionText = `Pos: (${Math.round(centerX)}, ${Math.round(
      centerY
    )})`;

    this.drawTextWithBackground(context, sizeText, centerX, centerY, size, 0);
    this.drawTextWithBackground(
      context,
      positionText,
      centerX,
      centerY,
      size,
      1
    );
  }

  private drawTextWithBackground(
    context: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    centerY: number,
    faceSize: number,
    lineIndex: number
  ): void {
    const padding = 4;
    const textHeight = 16;
    const textMetrics = context.measureText(text);

    const textX = centerX - faceSize / 2;
    const textY =
      centerY - faceSize / 2 - textHeight * (2 - lineIndex) - padding * 2;

    // Draw semi-transparent background
    context.fillStyle = 'rgba(255, 0, 0, 0.5)';
    context.fillRect(
      textX,
      textY,
      textMetrics.width + padding * 2,
      textHeight + padding
    );

    // Draw white text
    context.fillStyle = 'white';
    context.fillText(text, textX + padding, textY + textHeight - 4);
  }

  private detectAndRenderPupils(
    context: CanvasRenderingContext2D,
    faceRow: number,
    faceCol: number,
    faceSize: number,
    grayImageData: GrayImageData,
    canvas: HTMLCanvasElement
  ): void {
    // Detect and draw left eye pupil
    this.detectAndRenderSinglePupil(
      context,
      faceRow,
      faceCol,
      faceSize,
      this.constants.LEFT_EYE_OFFSET,
      grayImageData,
      canvas
    );

    // Detect and draw right eye pupil
    this.detectAndRenderSinglePupil(
      context,
      faceRow,
      faceCol,
      faceSize,
      this.constants.RIGHT_EYE_OFFSET,
      grayImageData,
      canvas
    );
  }

  private detectAndRenderSinglePupil(
    context: CanvasRenderingContext2D,
    faceRow: number,
    faceCol: number,
    faceSize: number,
    eyeOffset: number,
    grayImageData: GrayImageData,
    canvas: HTMLCanvasElement
  ): void {
    const eyeCoordinates = this.calculateEyeCoordinates(
      faceRow,
      faceCol,
      faceSize,
      eyeOffset
    );

    if (!this.areEyeCoordinatesValid(eyeCoordinates, canvas)) {
      return;
    }

    if (!this.isGrayImageDataValid(grayImageData)) {
      return;
    }

    const pupilCoordinates = this.pupilDetectionService.detectPupil(
      eyeCoordinates,
      grayImageData
    );

    if (pupilCoordinates) {
      this.drawPupilMarker(context, pupilCoordinates, canvas);
    }
  }

  private calculateEyeCoordinates(
    faceRow: number,
    faceCol: number,
    faceSize: number,
    eyeOffset: number
  ): EyeCoordinates {
    return {
      row: Math.round(
        faceRow - this.constants.EYE_VERTICAL_OFFSET_RATIO * faceSize
      ),
      col: Math.round(faceCol + eyeOffset * faceSize),
      size: Math.round(this.constants.EYE_SIZE_RATIO * faceSize),
    };
  }

  private areEyeCoordinatesValid(
    eyeCoordinates: EyeCoordinates,
    canvas: HTMLCanvasElement
  ): boolean {
    const { row, col, size } = eyeCoordinates;

    if (
      row < 0 ||
      col < 0 ||
      row >= canvas.height ||
      col >= canvas.width ||
      size <= 0
    ) {
      console.log('Eye coordinates are out of bounds or invalid');
      return false;
    }
    return true;
  }

  private isGrayImageDataValid(grayImageData: GrayImageData): boolean {
    const { pixels, nrows, ncols, ldim } = grayImageData;

    if (
      !pixels ||
      !pixels.length ||
      !Number.isInteger(nrows) ||
      !Number.isInteger(ncols) ||
      !Number.isInteger(ldim)
    ) {
      console.log('Invalid grayscale image data:', grayImageData);
      return false;
    }
    return true;
  }

  private drawPupilMarker(
    context: CanvasRenderingContext2D,
    pupilCoordinates: { row: number; col: number },
    canvas: HTMLCanvasElement
  ): void {
    const { row, col } = pupilCoordinates;

    if (row >= 0 && col >= 0 && row < canvas.height && col < canvas.width) {
      context.beginPath();
      context.arc(col, row, 2, 0, 2 * Math.PI);
      context.strokeStyle = 'red';
      context.lineWidth = 2;
      context.stroke();
    } else {
      console.log('Pupil coordinates are out of canvas bounds');
    }
  }

  displayProcessingTime(
    context: CanvasRenderingContext2D,
    startTime: number
  ): void {
    const endTime = performance.now();
    const processingTime = (endTime - startTime).toFixed(1);

    context.fillStyle = 'yellow';
    context.font = '18px Arial';
    context.fillText(`Process time: ${processingTime} ms`, 10, 25);
  }
}
