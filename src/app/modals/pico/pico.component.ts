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

@Component({
  selector: 'app-pico',
  templateUrl: './pico.component.html',
  styleUrls: ['./pico.component.scss'],
  standalone: false,
})
export class PicoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private camvas!: Camvas;
  private facefinder!: any;
  private memory!: any;

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private video!: HTMLVideoElement;

  iouthreshold = 0.2;

  constructor(private modalCtrl: ModalController) {}

  async ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    this.canvas = canvas;
    this.ctx = ctx;

    const modelUrl =
      'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder';
    const buf = await fetch(modelUrl).then((res) => res.arrayBuffer());
    this.facefinder = pico.unpack_cascade(new Int8Array(buf));
    this.memory = pico.instantiate_detection_memory(5);

    this.camvas = new Camvas(ctx, (video, dt) =>
      this.detect(video, ctx, canvas)
    );

    this.video = this.camvas.video;

    // รอให้ video โหลด metadata เพื่อให้รู้ขนาดจริง
    await new Promise<void>((resolve) => {
      this.camvas.video.onloadedmetadata = () => resolve();
    });

    // ตั้ง canvas ขนาดให้ตรงกับ video จริง
    canvas.width = this.camvas.videoWidth;
    canvas.height = this.camvas.videoHeight;
  }

  ngOnDestroy(): void {
    this.camvas?.stop();
  }

  private detect(
    video: HTMLVideoElement,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) {
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.scale(-1, 1); // mirror canvas แนวนอน
    ctx.drawImage(video, -w, 0, w, h);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, w, h);
    const gray = this.toGrayscale(imageData);

    let faces = pico.run_cascade(gray, this.facefinder, {
      shiftfactor: 0.1,
      scalefactor: 1.1,
      minsize: 100,
      maxsize: 1000,
    });

    faces = this.memory(faces);
    faces = pico.cluster_detections(faces, this.iouthreshold);

    for (const f of faces) {
      if (f[3] > 50) {
        const mirroredX = f[1]; // mirror ตำแหน่ง x
        ctx.beginPath();
        ctx.arc(mirroredX, f[0], f[2] / 2, 0, 2 * Math.PI);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'red';
        ctx.stroke();
      }
    }
  }

  onThresholdChange() {
    if (this.video && this.ctx && this.canvas) {
      this.detect(this.video, this.ctx, this.canvas);
    }
  }

  private toGrayscale(imageData: ImageData) {
    const gray = new Uint8Array(imageData.width * imageData.height);
    for (let i = 0; i < gray.length; i++) {
      const r = imageData.data[i * 4];
      const g = imageData.data[i * 4 + 1];
      const b = imageData.data[i * 4 + 2];
      gray[i] = (r + g + b) / 3;
    }
    return {
      pixels: gray,
      nrows: imageData.height,
      ncols: imageData.width,
      ldim: imageData.width,
    };
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
