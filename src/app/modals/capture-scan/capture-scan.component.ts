import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CameraManagerService } from '../../service/CameraManagerService/camera-manager.service';
import { FaceDetectionService } from '../../service/FaceDetectionService/face-detection-service.service';
import { ImageProcessingService } from '../../service/ImageProcessingService/image-processing-service.service';
import { DetectionStatisticsService } from '../../service/DetectionStatisticsService/detection-statistics.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-capture-scan',
  templateUrl: './capture-scan.component.html',
  styleUrls: ['./capture-scan.component.scss'],
  standalone: false,
})
export class CaptureScanComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoEl', { static: false })
  videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  capturedImage: string | null = null;
  detectedFaces: any[] = [];
  currentCount = 0;
  maxCount = 0;
  iouThreshold = 0.2;

  isCaptured = false;

  private ctx!: CanvasRenderingContext2D;

  constructor(
    private cameraService: CameraManagerService,
    private faceDetection: FaceDetectionService,
    private imageProcessing: ImageProcessingService,
    private detectionStats: DetectionStatisticsService,
    private modalCtrl: ModalController
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    await this.cameraService.initialize(this.ctx, () => {
      // ยังไม่ต้อง detect
    });

    this.videoRef.nativeElement.srcObject =
      this.cameraService.videoElement.srcObject;
  }

  async onCapture(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    const context = this.ctx;
    const video = this.videoRef.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capture frame
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();

    this.isCaptured = true;
    this.cameraService.stop();

    // ตรวจจับ
    const gray = this.imageProcessing.extractGrayscaleImageData(
      context,
      canvas
    );
    await this.faceDetection.initialize();
    this.detectedFaces = this.faceDetection.detectFaces(
      gray,
      this.iouThreshold
    );

    // 🎯 วาดวงกลมลง canvas
    this.drawFaceCircles(context, this.detectedFaces);

    // แปลง canvas เป็นรูป
    this.capturedImage = canvas.toDataURL('image/png');

    // สถิติ
    this.detectionStats.updateStatistics(this.detectedFaces, this.iouThreshold);
    this.currentCount = this.detectionStats.currentFaceCount;
    this.maxCount = this.detectionStats.getMaxFaceCount(this.iouThreshold);
  }

  private drawFaceCircles(
    context: CanvasRenderingContext2D,
    faces: any[]
  ): void {
    context.lineWidth = 2;
    context.strokeStyle = 'red';

    for (const face of faces) {
      const [row, col, size, score] = face;
      if (score > 0.0) {
        context.beginPath();
        context.arc(col, row, size / 2, 0, 2 * Math.PI);
        context.stroke();
      }
    }
  }

  ngOnDestroy(): void {
    this.cameraService.cleanup();
    this.faceDetection.cleanup();
    this.imageProcessing.cleanup();
    this.detectionStats.reset();
  }

  closeModal(): void {
    this.modalCtrl.dismiss();
  }
}
