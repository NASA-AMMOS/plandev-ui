import { Pipe, PipeTransform } from '@angular/core';
import { getDoyTimestamp } from '@gov.nasa.jpl.aerie/time';

@Pipe({ name: 'doyTimestamp' })
export class DoyTimestampPipe implements PipeTransform {
  transform(unixEpochTime: number): string {
    return getDoyTimestamp(unixEpochTime);
  }
}
