import { Injectable } from '@angular/core';
import { Constants } from 'src/app/data/constants';

// ประกาศ global variables สำหรับ libraries ภายนอก
declare var pico: any;
declare var lploc: any;

export interface ModelLoadResult {
  facefinder: any;
  pupilLocalizer: any;
}

@Injectable({
  providedIn: 'root',
})
export class LoadModelService {
  private constants = new Constants();
  private facefinder: any = null;
  private pupilLocalizer: any = null;
  private isLoaded = false;

  constructor() {}

  /**
   * โหลด detection models ทั้งหมด
   * @returns Promise<ModelLoadResult>
   */
  public async loadDetectionModels(): Promise<ModelLoadResult> {
    try {
      // ถ้าโหลดแล้ว ให้ return ค่าเดิม
      if (this.isLoaded && this.facefinder && this.pupilLocalizer) {
        console.log('Models already loaded, returning cached versions');
        return {
          facefinder: this.facefinder,
          pupilLocalizer: this.pupilLocalizer,
        };
      }

      console.log('Starting model loading process...');

      this.validateRequiredLibraries();

      // โหลดแบบ parallel เพื่อความเร็ว
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
      throw error;
    }
  }

  /**
   * ตรวจสอบว่า libraries ที่จำเป็นถูกโหลดแล้วหรือไม่
   */
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

    // ตรวจสอบ functions ที่จำเป็น
    if (typeof pico.unpack_cascade !== 'function') {
      throw new Error('pico.unpack_cascade function not available');
    }
    if (typeof lploc.unpack_localizer !== 'function') {
      throw new Error('lploc.unpack_localizer function not available');
    }
  }

  /**
   * โหลด Face Detection Model
   */
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

  /**
   * โหลด Pupil Localization Model
   */
  private async loadPupilLocalizationModel(): Promise<any> {
    console.log('Loading pupil localization model...');

    try {
      const response = await this.fetchWithRetry(
        this.constants.PUPIL_MODEL_URL,
        3
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load pupil model: ${response.status} ${response.statusText} - Make sure puploc.bin exists in assets/models/`
        );
      }

      const modelBuffer = await response.arrayBuffer();
      this.validatePupilModelBuffer(modelBuffer);

      console.log(`Pupil model loaded: ${modelBuffer.byteLength} bytes`);

      const pupilLocalizer = lploc.unpack_localizer(new Int8Array(modelBuffer));
      this.validatePupilLocalizer(pupilLocalizer);

      console.log('Pupil localization model loaded successfully');
      return pupilLocalizer;
    } catch (error : any) {
      console.error('Error loading pupil localization model:', error);
      throw new Error(
        `Pupil localization model loading failed: ${error.message}`
      );
    }
  }

  /**
   * Fetch with retry mechanism
   */
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
          // รอ 1 วินาทีก่อนลองใหม่
          await this.delay(1000 * (i + 1));
        }
      }
    }

    throw new Error(
      `Failed to fetch after ${maxRetries} attempts: ${lastError!.message}`
    );
  }

  /**
   * ตรวจสอบ Pupil Model Buffer
   */
  private validatePupilModelBuffer(buffer: ArrayBuffer): void {
    console.log(`Pupil model buffer size: ${buffer.byteLength} bytes`);

    if (buffer.byteLength === 0) {
      throw new Error('Pupil model file is empty');
    }

    // ตรวจสอบขนาดไฟล์ขั้นต่ำ (เช่น 1KB)
    if (buffer.byteLength < 1024) {
      console.warn('Pupil model file seems unusually small');
    }
  }

  /**
   * ตรวจสอบ Pupil Localizer
   */
  private validatePupilLocalizer(pupilLocalizer: any): void {
    if (!pupilLocalizer || typeof pupilLocalizer !== 'function') {
      throw new Error(
        'Failed to unpack pupil localizer - result is not a function'
      );
    }
  }

  /**
   * Utility function สำหรับ delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ตรวจสอบว่า models โหลดแล้วหรือไม่
   */
  public isModelsLoaded(): boolean {
    return this.isLoaded && !!this.facefinder && !!this.pupilLocalizer;
  }

  /**
   * รีเซ็ต models (สำหรับกรณีต้องการโหลดใหม่)
   */
  public resetModels(): void {
    this.facefinder = null;
    this.pupilLocalizer = null;
    this.isLoaded = false;
    console.log('Models reset');
  }

  /**
   * ดึงข้อมูล models ที่โหลดแล้ว
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
}
