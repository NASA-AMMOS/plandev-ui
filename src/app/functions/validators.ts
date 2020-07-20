import { AbstractControl } from '@angular/forms';

export function doyTimestampValidator(control: AbstractControl) {
  const re = /(\d{4})-((?=\d*[1-9])\d{3})T(\d{2}):(\d{2}):(\d{2})\.?(\d{3})?/;
  const match = re.exec(control.value);
  const error = { doyTimestamp: 'DOY format required: YYYY-DDDThh:mm:ss' };

  if (match) {
    const [, , doy] = match;
    const dayOfYear = parseInt(doy, 10);
    if (dayOfYear > 0 && dayOfYear < 366) {
      return null;
    } else {
      return error;
    }
  } else if (control.value === '') {
    return null;
  } else {
    return error;
  }
}
