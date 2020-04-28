import { NgModule } from '@angular/core';
import { StartCasePipe } from './start-case.pipe';

const PIPES = [StartCasePipe];

@NgModule({
  declarations: PIPES,
  exports: PIPES,
})
export class PipesModule {}
