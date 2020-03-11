import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgModule } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-panel-empty',
  styleUrls: ['./panel-empty.component.css'],
  templateUrl: './panel-empty.component.html',
})
export class PanelEmptyComponent {}

@NgModule({
  declarations: [PanelEmptyComponent],
  exports: [PanelEmptyComponent],
  imports: [CommonModule],
})
export class PanelEmptyModule {}
