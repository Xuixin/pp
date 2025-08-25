import { PupilDetectionService } from './../../service/PupilDetectionService/pupil-detection-service.service';
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
import { Constants } from 'src/app/data/constants';

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

  private constants = new Constants();

  constructor(
    private cameraService: CameraManagerService,
    private faceDetection: FaceDetectionService,
    private imageProcessing: ImageProcessingService,
    private detectionStats: DetectionStatisticsService,
    private modalCtrl: ModalController,
    private pupilDetectionService: PupilDetectionService
  ) {}

  async ngAfterViewInit(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    await this.cameraService.initialize(this.ctx, () => {});
    this.videoRef.nativeElement.srcObject =
      this.cameraService.videoElement.srcObject;

    this.pupilDetectionService.initialize();
    this.faceDetection.initialize();

    // เริ่ม capture ทุก 100 มิลลิวินาที
    this.captureInterval = setInterval(() => this.onCapture(), 100);
  }

  async onCapture(): Promise<void> {
    const canvas = this.canvasRef.nativeElement;
    const context = this.ctx;
    const video = this.videoRef.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // วาดวิดีโอ (ถ้าต้องการ mirror ให้ scale แบบใน CanvasRenderer)
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    this.isCaptured = true;

    const gray = this.imageProcessing.extractGrayscaleImageData(
      context,
      canvas
    );
    this.detectedFaces = this.faceDetection.detectFaces(
      gray,
      this.iouThreshold
    );

    context.lineWidth = 2;
    context.strokeStyle = 'red';

    for (const face of this.detectedFaces) {
      const [row, col, size, score] = face;
      if (score > 0.0) {
        // วาดวงกลมหน้า
        context.beginPath();
        context.arc(col, row, size / 2, 0, 2 * Math.PI);
        context.stroke();

        // คำนวณตำแหน่งตาซ้ายและขวา ตาม offset (ตามโปรเจคเก่า)
        const leftEye = {
          row: row - 0.075 * size,
          col: col - 0.175 * size,
          size: 0.35 * size,
        };
        const rightEye = {
          row: row - 0.075 * size,
          col: col + 0.175 * size,
          size: 0.35 * size,
        };

        // ตรวจจับม่านตาและวาดจุด
        [leftEye, rightEye].forEach((eyeCoord) => {
          if (this.isValidEyeCoord(eyeCoord, canvas)) {
            const pupilPos = this.pupilDetectionService.detectPupil(
              eyeCoord,
              gray
            );
            if (pupilPos) {
              context.beginPath();
              context.arc(pupilPos.col, pupilPos.row, 3, 0, 2 * Math.PI);
              context.fillStyle = 'blue';
              context.fill();
            }
          }
        });
      }
    }

    this.capturedImage = canvas.toDataURL('image/png');

    // อัปเดตสถิติ
    this.detectionStats.updateStatistics(this.detectedFaces, this.iouThreshold);
    this.currentCount = this.detectionStats.currentFaceCount;

    if (this.currentCount > this.maxCount) {
      this.maxCount = this.currentCount;
      this.maxCapturedImage = this.capturedImage;
    }
  }

  private isValidEyeCoord(
    eyeCoord: { row: number; col: number; size: number },
    canvas: HTMLCanvasElement
  ): boolean {
    return (
      eyeCoord.row >= 0 &&
      eyeCoord.col >= 0 &&
      eyeCoord.row < canvas.height &&
      eyeCoord.col < canvas.width &&
      eyeCoord.size > 0
    );
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
