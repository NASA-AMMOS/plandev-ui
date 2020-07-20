import { FormControl } from '@angular/forms';
import { doyTimestampValidator } from './validators';

describe('validators', () => {
  describe('doyTimestampValidator', () => {
    it('should return null for valid date', () => {
      const res = doyTimestampValidator(new FormControl('2020-001T00:00:00'));
      expect(res).toEqual(null);
    });

    it('should return null for empty string', () => {
      const res = doyTimestampValidator(new FormControl(''));
      expect(res).toEqual(null);
    });

    it('should return error for invalid date', () => {
      const res = doyTimestampValidator(new FormControl('2020'));
      expect(res).not.toEqual(null);
    });

    it('should return an error for a date with days all set to 000', () => {
      const res = doyTimestampValidator(new FormControl('2020-000T00:00:00'));
      expect(res).not.toEqual(null);
    });

    it('should return an error for a date with days out of range', () => {
      const res = doyTimestampValidator(new FormControl('2020-366T00:00:00'));
      expect(res).not.toEqual(null);
    });
  });
});
