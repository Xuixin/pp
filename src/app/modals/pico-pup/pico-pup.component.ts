import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Camvas } from './../../utils/camvas';
import { ModalController } from '@ionic/angular';

declare var pico: any;
declare var lploc: any;

@Component({
  selector: 'app-pico',
  templateUrl: './pico-pup.component.html',
  styleUrls: ['./pico-pup.component.scss'],
  standalone: false,
})
export class PicoPupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private camvas!: Camvas;
  private facefinder!: any;
  private doPuploc!: any;
  private memory!: any;
  private isInitialized = false;

  constructor(private modalCtrl: ModalController) {}

  async ngAfterViewInit() {
    try {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d')!;

      await this.loadModels();
      this.memory = pico.instantiate_detection_memory(5);
      await this.initializeCamera(ctx, canvas);

      this.isInitialized = true;
      console.log('PicoPup initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PicoPup:', error);
    }
  }

  ngOnDestroy(): void {
    this.camvas?.stop();
    this.isInitialized = false;
  }

  private async loadModels(): Promise<void> {
    try {
      // ตรวจสอบ libraries
      if (typeof pico === 'undefined') {
        throw new Error('pico library not loaded');
      }
      if (typeof lploc === 'undefined') {
        throw new Error('lploc library not loaded');
      }

      // Face detection model
      console.log('Loading face detection model...');
      const faceModelUrl =
        'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder';
      const faceResponse = await fetch(faceModelUrl);
      if (!faceResponse.ok)
        throw new Error(`Failed to load face model: ${faceResponse.status}`);
      const faceBuffer = await faceResponse.arrayBuffer();
      this.facefinder = pico.unpack_cascade(new Int8Array(faceBuffer));
      console.log('Face detection model loaded successfully');

      // Pupil localization model
      console.log('Loading pupil localization model...');
      const pupilModelUrl = 'assets/models/puploc.bin';
      const pupilResponse = await fetch(pupilModelUrl);
      if (!pupilResponse.ok) {
        console.error(`Failed to load pupil model: ${pupilResponse.status}`);
        console.log('Make sure puploc.bin exists in assets/models/');
        throw new Error(`Failed to load pupil model: ${pupilResponse.status}`);
      }

      const pupilBuffer = await pupilResponse.arrayBuffer();
      console.log(`Pupil model buffer size: ${pupilBuffer.byteLength} bytes`);

      if (pupilBuffer.byteLength === 0) {
        throw new Error('Pupil model file is empty');
      }

      // ตรวจสอบ lploc.unpack_localizer
      if (typeof lploc.unpack_localizer !== 'function') {
        throw new Error('lploc.unpack_localizer is not a function');
      }

      this.doPuploc = lploc.unpack_localizer(new Int8Array(pupilBuffer));

      if (!this.doPuploc || typeof this.doPuploc !== 'function') {
        throw new Error('Failed to unpack pupil localizer');
      }

      console.log('Pupil localization model loaded successfully');
      console.log('doPuploc function type:', typeof this.doPuploc);
    } catch (error) {
      console.error('Error in loadModels:', error);
      throw error;
    }
  }

  private async initializeCamera(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): Promise<void> {
    this.camvas = new Camvas(ctx, (video, dt) =>
      this.detect(video, ctx, canvas)
    );

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Camera timeout')),
        10000
      );
      this.camvas.video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve();
      };
    });

    canvas.width = this.camvas.videoWidth;
    canvas.height = this.camvas.videoHeight;
  }

  private detect(
    video: HTMLVideoElement,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    if (!this.isInitialized) return;

    const w = canvas.width;
    const h = canvas.height;
    const startTime = performance.now();

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw mirrored video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -w, 0, w, h);
    ctx.restore();

    // Get image data from displayed canvas (already mirrored)
    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = this.toGrayscale(imageData);

    // Detect faces
    let faces = pico.run_cascade(gray, this.facefinder, {
      shiftfactor: 0.1,
      scalefactor: 1.1,
      minsize: 100,
      maxsize: 1000,
    });

    faces = this.memory(faces);
    faces = pico.cluster_detections(faces, 0.2);

    // Draw results
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'red';
    ctx.font = '14px Arial';
    ctx.fillStyle = 'red';

    for (const face of faces) {
      if (face[3] > 50) {
        this.drawFaceResults(ctx, face, gray, w, h);
      }
    }

    // แสดง Process time
    const endTime = performance.now();
    const processTime = (endTime - startTime).toFixed(1);
    ctx.fillStyle = 'yellow';
    ctx.font = '18px Arial';
    ctx.fillText(`Process time: ${processTime} ms`, 10, 25);
  }

  private drawFaceResults(
    ctx: CanvasRenderingContext2D,
    face: any[],
    gray: any,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const [r, c, s] = face; // y, x, size

    // Face circle
    ctx.beginPath();
    ctx.arc(c, r, s / 2, 0, 2 * Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // แสดง Size และ Position เหมือน OpenCamIplocComponent
    const textSize = `Size: ${Math.round(s)} px`;
    const textPos = `Pos: (${Math.round(c)}, ${Math.round(r)})`;

    const padding = 4;
    const metrics1 = ctx.measureText(textSize);
    const metrics2 = ctx.measureText(textPos);
    const textHeight = 16;

    // วาดพื้นหลังโปร่งแสงสำหรับข้อความ
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(
      c - s / 2,
      r - s / 2 - textHeight * 2 - padding * 2,
      metrics1.width + padding * 2,
      textHeight + padding
    );
    ctx.fillRect(
      c - s / 2,
      r - s / 2 - textHeight - padding,
      metrics2.width + padding * 2,
      textHeight + padding
    );

    // วาดข้อความสีขาว
    ctx.fillStyle = 'white';
    ctx.fillText(
      textSize,
      c - s / 2 + padding,
      r - s / 2 - textHeight * 2 + 12
    );
    ctx.fillText(textPos, c - s / 2 + padding, r - s / 2 - textHeight + 12);

    // Detect pupils
    this.detectPupil(ctx, r, c, s, -0.175, gray, canvasWidth, canvasHeight); // Left eye
    this.detectPupil(ctx, r, c, s, 0.175, gray, canvasWidth, canvasHeight); // Right eye
  }

  private detectPupil(
    ctx: CanvasRenderingContext2D,
    faceR: number,
    faceC: number,
    faceS: number,
    eyeOffset: number,
    gray: any,
    canvasWidth: number,
    canvasHeight: number
  ) {
    // ตรวจสอบว่า doPuploc พร้อมใช้งาน
    if (!this.doPuploc || typeof this.doPuploc !== 'function') {
      console.log('doPuploc not available');
      return;
    }

    const eyeR = Math.round(faceR - 0.075 * faceS);
    const eyeC = Math.round(faceC + eyeOffset * faceS);
    const eyeS = Math.round(0.35 * faceS);

    // ตรวจสอบขอบเขต
    if (
      eyeR < 0 ||
      eyeC < 0 ||
      eyeR >= canvasHeight ||
      eyeC >= canvasWidth ||
      eyeS <= 0
    ) {
      console.log('Eye parameters out of bounds or invalid');
      return;
    }

    // ตรวจสอบ gray data
    if (
      !gray.pixels ||
      !gray.pixels.length ||
      !Number.isInteger(gray.nrows) ||
      !Number.isInteger(gray.ncols) ||
      !Number.isInteger(gray.ldim)
    ) {
      console.log('Invalid gray data:', gray);
      return;
    }

    try {
      // เรียกใช้ doPuploc แบบเดียวกับ OpenCamIplocComponent
      const result = this.doPuploc(
        eyeR, // number: row
        eyeC, // number: col
        eyeS, // number: scale
        63, // number: nperturbs
        gray // image object (ส่ง gray object ทั้งหมด)
      );

      if (Array.isArray(result) && result.length >= 2) {
        const [pr, pc] = result;

        if (
          typeof pr === 'number' &&
          typeof pc === 'number' &&
          pr >= 0 &&
          pc >= 0 &&
          pr < canvasHeight &&
          pc < canvasWidth
        ) {
          ctx.beginPath();
          ctx.arc(pc, pr, 2, 0, 2 * Math.PI);
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          console.log('Pupil not detected or invalid coordinates');
        }
      } else {
        console.log('Invalid doPuploc result format:', result);
      }
    } catch (error: any) {
      console.error('Pupil detection error:', error);
      console.error('Error details:', {
        message: error.message,
        eyeParams: { eyeR, eyeC, eyeS },
        grayInfo: {
          pixelsType: typeof gray.pixels,
          pixelsLength: gray.pixels?.length,
          nrows: gray.nrows,
          ncols: gray.ncols,
          ldim: gray.ldim,
        },
      });
    }
  }

  private toGrayscale(imageData: ImageData) {
    const { width, height, data } = imageData;
    const gray = new Uint8Array(width * height);

    // ใช้ formula เดียวกับ OpenCamIplocComponent
    for (let i = 0; i < gray.length; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      gray[i] = Math.round((2 * r + 7 * g + 1 * b) / 10);
    }

    return {
      pixels: gray,
      nrows: height,
      ncols: width,
      ldim: width,
    };
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
