import { Injectable } from '@angular/core';
import { Constants } from 'src/app/data/constants';
import { GrayImageData } from 'src/app/data/model';

declare var pico: any;

@Injectable({
  providedIn: 'root',
})
export class FaceDetectionService {
  private constants = new Constants();
  private facefinder: any;
  private detectionMemory: any;

  async initialize(): Promise<void> {
    await this.loadFaceDetectionModel();
    this.initializeDetectionMemory();
  }

  private async loadFaceDetectionModel(): Promise<void> {
    console.log('Loading face detection model...');

    const response = await fetch(this.constants.FACE_MODEL_URL);
    if (!response.ok) {
      throw new Error(`Failed to load face model: ${response.status}`);
    }

    const modelBuffer = await response.arrayBuffer();
    this.facefinder = pico.unpack_cascade(new Int8Array(modelBuffer));

    console.log('Face detection model loaded successfully');
  }

  private initializeDetectionMemory(): void {
    this.detectionMemory = pico.instantiate_detection_memory(
      this.constants.MEMORY_SIZE
    );
  }

  detectFaces(grayImageData: GrayImageData, iouThreshold: number): any[] {
    let faces = pico.run_cascade(grayImageData, this.facefinder, {
      shiftfactor: 0.1,
      scalefactor: 1.1,
      minsize: this.constants.MIN_DETECTION_SIZE,
      maxsize: this.constants.MAX_DETECTION_SIZE,
    });

    faces = this.detectionMemory(faces);
    const clustered = pico.cluster_detections(faces, iouThreshold);

    // 🔥 เพิ่มตรงนี้: กรองเฉพาะ face ที่ score > 50.0
    return clustered.filter((face: any) => face[3] > 50.0);
  }

  cleanup(): void {
    this.detectionMemory = undefined;
    this.facefinder = undefined;
  }
}
