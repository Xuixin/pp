import { TestBed } from '@angular/core/testing';

import { PupilDetectionService } from './pupil-detection-service.service';

describe('PupilDetectionServiceService', () => {
  let service: PupilDetectionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PupilDetectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
