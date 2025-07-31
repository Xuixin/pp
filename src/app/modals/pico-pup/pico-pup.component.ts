import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FaceDetectionService } from '../../service/FaceDetectionService/face-detection-service.service';
import { PupilDetectionService } from '../../service/PupilDetectionService/pupil-detection-service.service';
import { ImageProcessingService } from '../../service/ImageProcessingService/image-processing-service.service';
import { CanvasRendererService } from '../../service/CanvasRendererService/canvas-renderer.service';
import { CameraManagerService } from '../../service/CameraManagerService/camera-manager.service';
import { DetectionStatisticsService } from '../../service/DetectionStatisticsService/detection-statistics.service';

@Component({
  selector: 'app-pico',
  templateUrl: './pico-pup.component.html',
  styleUrls: ['./pico-pup.component.scss'],
  standalone: false,
})
export class PicoPupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private canvas!: HTMLCanvasElement;
  private canvasContext!: CanvasRenderingContext2D;
  private isSystemInitialized = false;

  // Detection settings
  public iouThreshold = 0.2;

  // Capture logic
  private startTime: number = 0;
  private validStartTime: number | null = null;
  private faceValidationPassed: boolean = true;
  private readonly IDLE_TIME_MS = 3000;
  private readonly EVALUATION_WINDOW_MS = 5000;
  public croppedFaceImages: string[] = [];
  private hasCaptured = false;

  constructor(
    private modalController: ModalController,
    private faceDetectionService: FaceDetectionService,
    private pupilDetectionService: PupilDetectionService,
    private imageProcessingService: ImageProcessingService,
    private canvasRendererService: CanvasRendererService,
    private cameraManagerService: CameraManagerService,
    public detectionStatisticsService: DetectionStatisticsService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.initializeSystem();
      console.log('PicoPup system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PicoPup system:', error);
    }
  }

  ngOnDestroy(): void {
    this.cleanupResources();
  }

  private async initializeSystem(): Promise<void> {
    this.setupCanvasElements();
    await this.loadDetectionModels();
    await this.setupCameraStream();
    this.isSystemInitialized = true;
  }

  get currentFaceCount(): number {
    return this.detectionStatisticsService.currentFaceCount;
  }

  get maxFaceCountByThreshold(): { [threshold: string]: number } {
    return this.detectionStatisticsService.maxFaceCountByThreshold;
  }

  private setupCanvasElements(): void {
    this.canvas = this.canvasRef.nativeElement;
    this.canvasContext = this.canvas.getContext('2d')!;
  }

  private async loadDetectionModels(): Promise<void> {
    await Promise.all([
      this.faceDetectionService.initialize(),
      this.pupilDetectionService.initialize(),
    ]);
  }

  private async setupCameraStream(): Promise<void> {
    await this.cameraManagerService.initialize(
      this.canvasContext,
      (video, dt) => this.processVideoFrame(video)
    );
    this.adjustCanvasToVideoSize();
  }

  private adjustCanvasToVideoSize(): void {
    this.canvas.width = this.cameraManagerService.videoWidth;
    this.canvas.height = this.cameraManagerService.videoHeight;
  }

  private processVideoFrame(video: HTMLVideoElement): void {
    if (!this.isSystemInitialized || this.hasCaptured) return;

    const startTime = performance.now();

    this.canvasRendererService.clearAndDrawMirroredVideo(
      this.canvasContext,
      this.canvas,
      video
    );
    const grayImageData = this.imageProcessingService.extractGrayscaleImageData(
      this.canvasContext,
      this.canvas
    );
    const detectedFaces = this.faceDetectionService.detectFaces(
      grayImageData,
      this.iouThreshold
    );

    this.handleCaptureLogic(detectedFaces);

    if (!this.hasCaptured) {
      this.canvasRendererService.renderDetectionResults(
        this.canvasContext,
        detectedFaces,
        grayImageData,
        this.canvas
      );
      this.detectionStatisticsService.updateStatistics(
        detectedFaces,
        this.iouThreshold
      );
      this.canvasRendererService.displayProcessingTime(
        this.canvasContext,
        startTime
      );
    }
  }

  private handleCaptureLogic(detectedFaces: any[]): void {
    const now = performance.now();

    if (this.startTime === 0) {
      this.startTime = now;
    }

    if (now - this.startTime > this.IDLE_TIME_MS) {
      const maxFace = this.detectionStatisticsService.getMaxFaceCount(
        this.iouThreshold
      );
      const threshold = Math.floor(maxFace / 2);

      if (this.validStartTime === null) {
        this.validStartTime = now;
        this.faceValidationPassed = true;
      }

      if (detectedFaces.length < threshold) {
        this.validStartTime = null;
        this.faceValidationPassed = false;
        console.log('เฟรมไม่ผ่านเงื่อนไข > ครึ่ง, เริ่มนับใหม่');
      } else {
        if (
          now - this.validStartTime >= this.EVALUATION_WINDOW_MS &&
          this.faceValidationPassed
        ) {
          console.log('✔ ครบ 5 วิ เฟรมนี้ผ่านทั้งหมด, crop เฟรมนี้เลย');
          this.croppedFaceImages = this.imageProcessingService.captureFaces(
            this.canvas,
            detectedFaces
          );
          this.hasCaptured = true;
          this.cameraManagerService.stop();
          return;
        }
      }
    }
  }

  public onThresholdChange(): void {
    if (this.isSystemReady()) {
      this.processVideoFrame(this.cameraManagerService.videoElement);
    }
  }

  private isSystemReady(): boolean {
    return (
      this.isSystemInitialized &&
      this.cameraManagerService.videoElement != null &&
      this.canvasContext != null &&
      this.canvas != null
    );
  }

  private cleanupResources(): void {
    this.cameraManagerService.cleanup();
    this.imageProcessingService.cleanup();
    this.faceDetectionService.cleanup();
    this.pupilDetectionService.cleanup();
    this.detectionStatisticsService.reset();
    this.isSystemInitialized = false;
  }

  public closeModal(): void {
    this.cameraManagerService.stop();
    this.modalController.dismiss();
  }
}
