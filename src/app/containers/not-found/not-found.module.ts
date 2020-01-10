import { NgModule } from '@angular/core';
import { MaterialModule } from '../../material';
import { NotFoundComponent } from './not-found.component';

@NgModule({
  declarations: [NotFoundComponent],
  exports: [NotFoundComponent],
  imports: [MaterialModule],
})
export class NotFoundModule {}
