import { TestBed } from '@angular/core/testing';

import { DetectionStatisticsService } from './detection-statistics.service';

describe('DetectionStatisticsService', () => {
  let service: DetectionStatisticsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetectionStatisticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
