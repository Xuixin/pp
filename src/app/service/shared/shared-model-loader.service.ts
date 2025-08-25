import { Injectable } from '@angular/core';
import { Constants } from '../../data/constants';

declare var pico: any;
declare var lploc: any;

export interface ModelLoadResult {
  facefinder: any;
  pupilLocalizer: any;
}

@Injectable({
  providedIn: 'root',
})
export class SharedModelLoaderService {
  private constants = new Constants();
  private facefinder: any = null;
  private pupilLocalizer: any = null;
  private isLoaded = false;
  private loadPromise: Promise<ModelLoadResult> | null = null;

  /**
   * Load both face detection and pupil localization models
   * Uses singleton pattern to ensure models are loaded only once
   */
  public async loadModels(): Promise<ModelLoadResult> {
    // Return existing promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Return cached models if already loaded
    if (this.isLoaded && this.facefinder && this.pupilLocalizer) {
      console.log('Models already loaded, returning cached versions');
      return {
        facefinder: this.facefinder,
        pupilLocalizer: this.pupilLocalizer,
      };
    }

    // Create new loading promise
    this.loadPromise = this.performModelLoading();
    return this.loadPromise;
  }

  private async performModelLoading(): Promise<ModelLoadResult> {
    try {
      console.log('Starting model loading process...');
      this.validateRequiredLibraries();

      // Load models in parallel for better performance
      const [facefinder, pupilLocalizer] = await Promise.all([
        this.loadFaceDetectionModel(),
        this.loadPupilLocalizationModel(),
      ]);

      this.facefinder = facefinder;
      this.pupilLocalizer = pupilLocalizer;
      this.isLoaded = true;

      console.log('All models loaded successfully');

      return {
        facefinder: this.facefinder,
        pupilLocalizer: this.pupilLocalizer,
      };
    } catch (error) {
      console.error('Failed to load detection models:', error);
      this.isLoaded = false;
      this.loadPromise = null; // Reset promise on error
      throw error;
    }
  }

  private validateRequiredLibraries(): void {
    if (typeof pico === 'undefined') {
      throw new Error(
        'Pico library not loaded. Please include pico.js in your project.'
      );
    }
    if (typeof lploc === 'undefined') {
      throw new Error(
        'Lploc library not loaded. Please include lploc.js in your project.'
      );
    }

    if (typeof pico.unpack_cascade !== 'function') {
      throw new Error('pico.unpack_cascade function not available');
    }
    if (typeof lploc.unpack_localizer !== 'function') {
      throw new Error('lploc.unpack_localizer function not available');
    }
  }

  private async loadFaceDetectionModel(): Promise<any> {
    console.log('Loading face detection model...');

    try {
      const response = await this.fetchWithRetry(
        this.constants.FACE_MODEL_URL,
        3
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load face model: ${response.status} ${response.statusText}`
        );
      }

      const modelBuffer = await response.arrayBuffer();

      if (modelBuffer.byteLength === 0) {
        throw new Error('Face model file is empty');
      }

      console.log(`Face model loaded: ${modelBuffer.byteLength} bytes`);

      const facefinder = pico.unpack_cascade(new Int8Array(modelBuffer));

      if (!facefinder) {
        throw new Error('Failed to unpack face detection cascade');
      }

      console.log('Face detection model loaded successfully');
      return facefinder;
    } catch (error: any) {
      console.error('Error loading face detection model:', error);
      throw new Error(`Face detection model loading failed: ${error.message}`);
    }
  }

  private async loadPupilLocalizationModel(): Promise<any> {
    console.log('Loading pupil localization model...');

    try {
      const response = await this.fetchWithRetry(
        this.constants.PUPIL_MODEL_URL,
        3
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load pupil model: ${response.status} ${response.statusText}`
        );
      }

      const modelBuffer = await response.arrayBuffer();
      this.validatePupilModelBuffer(modelBuffer);

      console.log(`Pupil model loaded: ${modelBuffer.byteLength} bytes`);

      const pupilLocalizer = lploc.unpack_localizer(new Int8Array(modelBuffer));
      this.validatePupilLocalizer(pupilLocalizer);

      console.log('Pupil localization model loaded successfully');
      return pupilLocalizer;
    } catch (error: any) {
      console.error('Error loading pupil localization model:', error);
      throw new Error(
        `Pupil localization model loading failed: ${error.message}`
      );
    }
  }

  private async fetchWithRetry(
    url: string,
    maxRetries: number
  ): Promise<Response> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(
          `Attempting to fetch ${url} (attempt ${i + 1}/${maxRetries})`
        );

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fetch attempt ${i + 1} failed:`, error);

        if (i < maxRetries - 1) {
          await this.delay(1000 * (i + 1)); // Progressive delay
        }
      }
    }

    throw new Error(
      `Failed to fetch after ${maxRetries} attempts: ${lastError!.message}`
    );
  }

  private validatePupilModelBuffer(buffer: ArrayBuffer): void {
    console.log(`Pupil model buffer size: ${buffer.byteLength} bytes`);

    if (buffer.byteLength === 0) {
      throw new Error('Pupil model file is empty');
    }

    if (buffer.byteLength < 1024) {
      console.warn('Pupil model file seems unusually small');
    }
  }

  private validatePupilLocalizer(pupilLocalizer: any): void {
    if (!pupilLocalizer || typeof pupilLocalizer !== 'function') {
      throw new Error(
        'Failed to unpack pupil localizer - result is not a function'
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if models are loaded and ready
   */
  public isModelsLoaded(): boolean {
    return this.isLoaded && !!this.facefinder && !!this.pupilLocalizer;
  }

  /**
   * Get loaded models (returns null if not loaded)
   */
  public getLoadedModels(): ModelLoadResult | null {
    if (this.isModelsLoaded()) {
      return {
        facefinder: this.facefinder,
        pupilLocalizer: this.pupilLocalizer,
      };
    }
    return null;
  }

  /**
   * Reset models (for testing or reloading)
   */
  public resetModels(): void {
    this.facefinder = null;
    this.pupilLocalizer = null;
    this.isLoaded = false;
    this.loadPromise = null;
    console.log('Models reset');
  }
}
