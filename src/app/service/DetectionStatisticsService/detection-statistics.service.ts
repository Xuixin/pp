import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DetectionStatisticsService {
  public currentFaceCount = 0;
  public maxFaceCountByThreshold: { [threshold: string]: number } = {};

  updateStatistics(faces: any[], iouThreshold: number): void {
    this.currentFaceCount = faces.length;
    this.updateMaxFaceCount(faces.length, iouThreshold);
  }

  private updateMaxFaceCount(currentCount: number, iouThreshold: number): void {
    const thresholdKey = iouThreshold.toFixed(2);

    if (
      !this.maxFaceCountByThreshold[thresholdKey] ||
      currentCount > this.maxFaceCountByThreshold[thresholdKey]
    ) {
      this.maxFaceCountByThreshold[thresholdKey] = currentCount;
    }
  }

  getMaxFaceCount(iouThreshold: number): number {
    const thresholdKey = iouThreshold.toFixed(2);
    return this.maxFaceCountByThreshold[thresholdKey] || 0;
  }

  reset(): void {
    this.currentFaceCount = 0;
    this.maxFaceCountByThreshold = {};
  }
}
