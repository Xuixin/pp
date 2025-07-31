import { TestBed } from '@angular/core/testing';

import { CanvasRendererService } from './canvas-renderer.service';

describe('CanvasRendererService', () => {
  let service: CanvasRendererService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CanvasRendererService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
