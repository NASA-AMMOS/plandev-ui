import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgModule } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'panel-header',
  styleUrls: ['./panel-header.component.css'],
  templateUrl: './panel-header.component.html',
})
export class PanelHeaderComponent {}

@NgModule({
  declarations: [PanelHeaderComponent],
  exports: [PanelHeaderComponent],
  imports: [CommonModule],
})
export class PanelHeaderModule {}
