import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { PipesModule } from '../../pipes';
import { ConstraintViolation } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'violation-list',
  styles: [
    `
      mat-icon {
        color: rgba(0, 0, 0, 0.6);
      }

      .violation {
        display: flex;
      }

      .left {
        align-items: center;
        display: flex;
        flex-grow: 1;
      }

      .right {
        align-items: center;
        justify-content: flex-end;
      }
    `,
  ],
  template: `
    <div *ngIf="violations && violations.length">
      <mat-divider></mat-divider>
      <mat-list>
        <mat-list-item *ngFor="let violation of violations">
          <div class="violation w-100">
            <div class="left">
              {{ violation.constraint.name }}
            </div>
            <div class="right"></div>
          </div>
          <mat-divider></mat-divider>
        </mat-list-item>
      </mat-list>
    </div>
  `,
})
export class ViolationListComponent {
  @Input() violations: ConstraintViolation[] = [];
}

@NgModule({
  declarations: [ViolationListComponent],
  exports: [ViolationListComponent],
  imports: [CommonModule, MaterialModule, PipesModule],
})
export class ViolationListModule {}
