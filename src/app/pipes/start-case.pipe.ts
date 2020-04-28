import { Pipe, PipeTransform } from '@angular/core';
import startCase from 'lodash-es/startCase';

@Pipe({ name: 'startcase' })
export class StartCasePipe implements PipeTransform {
  transform(value: string): string {
    return startCase(value);
  }
}
