import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'toLocaleString' })
export class ToLocaleStringPipe implements PipeTransform {
  transform(time: number): string {
    return new Date(time).toLocaleString();
  }
}
