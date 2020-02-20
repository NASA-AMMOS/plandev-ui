import { ChangeDetectionStrategy, Component, NgModule } from '@angular/core';
import { MaterialModule } from '../../material';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toolbar',
  styleUrls: ['./toolbar.component.css'],
  templateUrl: './toolbar.component.html',
})
export class ToolbarComponent {}

@NgModule({
  declarations: [ToolbarComponent],
  exports: [ToolbarComponent],
  imports: [MaterialModule],
})
export class ToolbarModule {}
