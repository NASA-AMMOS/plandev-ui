import { Injectable } from '@angular/core';

@Injectable()
export class ActivityInstanceFormMockService {
  reduceParameters() {
    return [];
  }

  validateParameterValue() {
    return new Promise(resolve => resolve({ errors: [], success: true }));
  }
}
