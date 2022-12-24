import type { Field, ValidationResult } from '../types/form';
import { getDaysInYear } from './time';

export function min(min: number, errorMessage?: string): (value: number) => Promise<ValidationResult> {
  return (value: number): Promise<ValidationResult> =>
    new Promise(resolve => {
      if (value < min) {
        const error = errorMessage ?? `Field cannot be less than ${min}`;
        return resolve(error);
      } else {
        return resolve(null);
      }
    });
}

export function required(value: number | string): Promise<ValidationResult> {
  return new Promise(resolve => {
    if ((typeof value === 'number' && Number.isNaN(value as number)) || (typeof value === 'string' && value === '')) {
      return resolve('Field is required');
    } else {
      return resolve(null);
    }
  });
}

export function timestamp(value: string): Promise<ValidationResult> {
  return new Promise(resolve => {
    const re = /^(\d{4})-((?=\d*[1-9])\d{3})T(\d{2}):(\d{2}):(\d{2})(\.(\d{1,6}))?$/;
    const match = re.exec(value);
    const error = 'DOY format required: YYYY-DDDThh:mm:ss';

    if (match) {
      const [, year, doy] = match;

      const daysInYear = getDaysInYear(Number.parseInt(year));

      const dayOfYear = parseInt(doy, 10);
      if (dayOfYear > 0 && dayOfYear <= daysInYear) {
        return resolve(null);
      } else {
        return resolve(`Day-of-year must be between 0 and ${daysInYear}`);
      }
    } else {
      return resolve(error);
    }
  });
}

export async function validateField<T>(field: Field<T>): Promise<string[]> {
  const { validators, value } = field;
  const errors: string[] = [];

  for (const validator of validators) {
    const error = await validator(value);

    if (error !== null) {
      errors.push(error);
    }
  }

  return errors;
}
