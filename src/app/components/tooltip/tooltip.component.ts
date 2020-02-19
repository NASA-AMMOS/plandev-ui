import { ChangeDetectionStrategy, Component, NgModule } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tooltip',
  styleUrls: ['./tooltip.component.css'],
  template: '',
})
export class TooltipComponent {}

@NgModule({
  declarations: [TooltipComponent],
  exports: [TooltipComponent],
})
export class TooltipModule {}
