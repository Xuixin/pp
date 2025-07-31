import { Injectable } from '@angular/core';
import { Constants } from 'src/app/data/constants';
import { Camvas } from './../../utils/camvas';

@Injectable({
  providedIn: 'root',
})
export class CameraManagerService {
  private constants = new Constants();
  private camvas!: Camvas;
  public videoElement!: HTMLVideoElement;

  async initialize(
    canvasContext: CanvasRenderingContext2D,
    onFrame: (video: HTMLVideoElement, dt: number) => void
  ): Promise<void> {
    this.camvas = new Camvas(canvasContext, onFrame);
    await this.waitForCameraReady();
    this.videoElement = this.camvas.video;
  }

  private async waitForCameraReady(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Camera initialization timeout')),
        this.constants.CAMERA_TIMEOUT
      );

      this.camvas.video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  }

  get videoWidth(): number {
    return this.camvas?.videoWidth || 0;
  }

  get videoHeight(): number {
    return this.camvas?.videoHeight || 0;
  }

  stop(): void {
    this.camvas?.stop();
  }

  cleanup(): void {
    this.camvas?.stop();
  }
}
