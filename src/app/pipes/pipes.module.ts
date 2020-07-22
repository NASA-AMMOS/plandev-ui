import { NgModule } from '@angular/core';
import { DoyTimestampPipe } from './doy-timestamp.pipe';
import { SafePipe } from './safe.pipe';
import { StartCasePipe } from './start-case.pipe';
import { ValuesPipe } from './values.pipe';

const PIPES = [DoyTimestampPipe, SafePipe, StartCasePipe, ValuesPipe];

@NgModule({
  declarations: PIPES,
  exports: PIPES,
})
export class PipesModule {}
