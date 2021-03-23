import { NgModule } from '@angular/core';
import { DoyTimestampPipe } from './doy-timestamp.pipe';
import { SafePipe } from './safe.pipe';
import { ToLocaleStringPipe } from './to-locale-string.pipe';

const PIPES = [DoyTimestampPipe, SafePipe, ToLocaleStringPipe];

@NgModule({
  declarations: PIPES,
  exports: PIPES,
})
export class PipesModule {}
