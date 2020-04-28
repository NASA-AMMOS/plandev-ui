import { AbstractControl } from '@angular/forms';

export function doyTimestampValidator(control: AbstractControl) {
  const re = /(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2})\.?(\d{3})?/;
  const valid = re.test(control.value) || control.value === '';
  return valid
    ? null
    : { doyTimestamp: 'DOY format required: YYYY-DDDThh:mm:ss' };
}
