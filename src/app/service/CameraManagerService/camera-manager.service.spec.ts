import { TestBed } from '@angular/core/testing';

import { CameraManagerService } from './camera-manager.service';

describe('CameraManagerService', () => {
  let service: CameraManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CameraManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
