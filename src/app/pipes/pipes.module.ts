import { NgModule } from '@angular/core';
import { StartCasePipe } from './start-case.pipe';
import { ValuesPipe } from './values.pipe';

const PIPES = [StartCasePipe, ValuesPipe];

@NgModule({
  declarations: PIPES,
  exports: PIPES,
})
export class PipesModule {}
