import { Injectable } from '@angular/core';
import { Constants } from 'src/app/data/constants';
import { GrayImageData, EyeCoordinates } from 'src/app/data/model';

declare var lploc: any;

@Injectable({
  providedIn: 'root',
})
export class PupilDetectionService {
  private constants = new Constants();
  private pupilLocalizer: any;

  async initialize(): Promise<void> {
    await this.loadPupilLocalizationModel();
  }

  private async loadPupilLocalizationModel(): Promise<void> {
    console.log('Loading pupil localization model...');

    const response = await fetch(this.constants.PUPIL_MODEL_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to load pupil model: ${response.status} - Make sure puploc.bin exists in assets/models/`
      );
    }

    const modelBuffer = await response.arrayBuffer();
    this.validatePupilModelBuffer(modelBuffer);

    this.pupilLocalizer = lploc.unpack_localizer(new Int8Array(modelBuffer));
    this.validatePupilLocalizer();

    console.log('Pupil localization model loaded successfully');
  }

  private validatePupilModelBuffer(buffer: ArrayBuffer): void {
    console.log(`Pupil model buffer size: ${buffer.byteLength} bytes`);
    if (buffer.byteLength === 0) {
      throw new Error('Pupil model file is empty');
    }
  }

  private validatePupilLocalizer(): void {
    if (typeof lploc.unpack_localizer !== 'function') {
      throw new Error('lploc.unpack_localizer is not a function');
    }

    if (!this.pupilLocalizer || typeof this.pupilLocalizer !== 'function') {
      throw new Error('Failed to unpack pupil localizer');
    }
  }

  detectPupil(
    eyeCoordinates: EyeCoordinates,
    grayImageData: GrayImageData
  ): { row: number; col: number } | null {
    if (!this.isPupilLocalizerReady()) {
      return null;
    }

    try {
      const result = this.pupilLocalizer(
        eyeCoordinates.row,
        eyeCoordinates.col,
        eyeCoordinates.size,
        this.constants.PUPIL_PERTURBATIONS,
        grayImageData
      );

      return this.validateAndExtractPupilResult(result);
    } catch (error: any) {
      this.logPupilDetectionError(error, eyeCoordinates, grayImageData);
      return null;
    }
  }

  private isPupilLocalizerReady(): boolean {
    if (!this.pupilLocalizer || typeof this.pupilLocalizer !== 'function') {
      console.log('Pupil localizer not available');
      return false;
    }
    return true;
  }

  private validateAndExtractPupilResult(
    result: any
  ): { row: number; col: number } | null {
    if (!Array.isArray(result) || result.length < 2) {
      console.log('Invalid pupil localizer result format:', result);
      return null;
    }

    const [pupilRow, pupilCol] = result;

    if (typeof pupilRow !== 'number' || typeof pupilCol !== 'number') {
      console.log('Pupil coordinates are not numbers:', result);
      return null;
    }

    return { row: pupilRow, col: pupilCol };
  }

  private logPupilDetectionError(
    error: any,
    eyeCoordinates: EyeCoordinates,
    grayImageData: GrayImageData
  ): void {
    console.error('Pupil detection error:', error);
    console.error('Error details:', {
      message: error.message,
      eyeCoordinates,
      grayImageInfo: {
        pixelsType: typeof grayImageData.pixels,
        pixelsLength: grayImageData.pixels?.length,
        nrows: grayImageData.nrows,
        ncols: grayImageData.ncols,
        ldim: grayImageData.ldim,
      },
    });
  }

  cleanup(): void {
    this.pupilLocalizer = undefined;
  }
}
