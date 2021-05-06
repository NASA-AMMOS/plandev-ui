import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import { ConstraintViolation, TimeRange } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'violation-list',
  styles: [
    `
      mat-card {
        margin: 5px;
      }

      .window {
        cursor: pointer;
        margin-right: 10px;
        text-decoration: underline;
        text-indent: 20px;
      }
    `,
  ],
  template: `
    <mat-card *ngFor="let violation of violations">
      <div>
        {{ violation.constraint.name }}
      </div>

      <div
        *ngFor="let window of violation.windows"
        class="ellipsis window"
        (click)="selectWindow.emit(window)"
      >
        {{ window.start | doyTimestamp }} - {{ window.end | doyTimestamp }}
      </div>
    </mat-card>
  `,
})
export class ViolationListComponent {
  @Input() violations: ConstraintViolation[] = [];

  @Output()
  selectWindow: E<TimeRange> = new E();
}

@NgModule({
  declarations: [ViolationListComponent],
  exports: [ViolationListComponent],
  imports: [CommonModule, MaterialModule, PipesModule],
})
export class ViolationListModule {}
