import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgModule } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-panel-collapsed',
  styleUrls: ['./panel-collapsed.component.css'],
  templateUrl: './panel-collapsed.component.html',
})
export class PanelCollapsedComponent {}

@NgModule({
  declarations: [PanelCollapsedComponent],
  exports: [PanelCollapsedComponent],
  imports: [CommonModule],
})
export class PanelCollapsedModule {}
