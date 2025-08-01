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
  maxCapturedImage: string | null = null; // ⬅️ รูปที่ตรวจพบหน้าสูงสุด
  detectedFaces: any[] = [];
  currentCount = 0;
  maxCount = 0;
  iouThreshold = 0.2;
  isCaptured = false;
  showCaptureImg = false;

  private ctx!: CanvasRenderingContext2D;
  private captureInterval: any;

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

    await this.cameraService.initialize(this.ctx, () => {});
    this.videoRef.nativeElement.srcObject =
      this.cameraService.videoElement.srcObject;

    // เริ่ม capture ทุก 100 มิลลิวินาที
    this.captureInterval = setInterval(() => this.onCapture(), 100);
  }

  async onCapture(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    const context = this.ctx;
    const video = this.videoRef.nativeElement;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.isCaptured = true;

    const gray = this.imageProcessing.extractGrayscaleImageData(
      context,
      canvas
    );
    await this.faceDetection.initialize();
    this.detectedFaces = this.faceDetection.detectFaces(
      gray,
      this.iouThreshold
    );

    // วาดวงกลม
    context.lineWidth = 2;
    context.strokeStyle = 'red';
    for (const face of this.detectedFaces) {
      const [row, col, size, score] = face;
      if (score > 0.0) {
        context.beginPath();
        context.arc(col, row, size / 2, 0, 2 * Math.PI);
        context.stroke();
      }
    }

    this.capturedImage = canvas.toDataURL('image/png');

    // อัปเดตสถิติ
    this.detectionStats.updateStatistics(this.detectedFaces, this.iouThreshold);
    this.currentCount = this.detectionStats.currentFaceCount;

    // ถ้ามีใบหน้ามากกว่าก่อนหน้า → เก็บรูปนี้ไว้
    if (this.currentCount > this.maxCount) {
      this.maxCount = this.currentCount;
      this.maxCapturedImage = this.capturedImage;
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.captureInterval);
    this.cameraService.cleanup();
    this.faceDetection.cleanup();
    this.imageProcessing.cleanup();
    this.detectionStats.reset();
  }

  closeModal(): void {
    this.modalCtrl.dismiss();
  }
}
