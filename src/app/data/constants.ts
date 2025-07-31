// Constants
export class Constants {
  readonly FACE_MODEL_URL =
    'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder';
  readonly PUPIL_MODEL_URL = 'assets/models/puploc.bin';
  readonly CAMERA_TIMEOUT = 10000;
  readonly MIN_FACE_SIZE = 50;
  readonly MIN_DETECTION_SIZE = 100;
  readonly MAX_DETECTION_SIZE = 1000;
  readonly MEMORY_SIZE = 5;
  readonly PUPIL_PERTURBATIONS = 63;
  readonly LEFT_EYE_OFFSET = -0.175;
  readonly RIGHT_EYE_OFFSET = 0.175;
  readonly EYE_VERTICAL_OFFSET_RATIO = 0.075;
  readonly EYE_SIZE_RATIO = 0.35;
}
