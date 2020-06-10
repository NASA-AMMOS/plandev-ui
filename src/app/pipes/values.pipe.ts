import { Pipe, PipeTransform } from '@angular/core';
import { StringTMap } from '../types';

@Pipe({ name: 'values' })
export class ValuesPipe implements PipeTransform {
  transform(value: StringTMap<any>): any[] {
    return Object.values(value).flat();
  }
}
