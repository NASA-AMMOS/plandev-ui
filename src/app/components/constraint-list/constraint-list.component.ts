import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../material';
import { Constraint } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'constraint-list',
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        height: 100%;
        width: 100%;
      }

      .container {
        flex-grow: 1;
        overflow: auto;
      }

      .constraint {
        display: flex;
      }

      .create-button {
        color: #ffffff;
        background: #0d1667;
        line-height: 24px;
        width: 176px;
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

      footer {
        align-items: center;
        box-shadow: 0px 0 5px 0px rgb(0 0 0 / 20%);
        display: flex;
        flex-shrink: 0;
        justify-content: center;
        padding: 20px;
      }

      mat-expansion-panel {
        border-radius: 0px;
        margin-bottom: 20px;
      }

      mat-expansion-panel-header {
        border-radius: 0px;
        box-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2),
          0px 1px 1px 0px rgba(0, 0, 0, 0.14),
          0px 1px 3px 0px rgba(0, 0, 0, 0.12);
      }

      .expansion-panel-body {
        padding-top: 10px;
      }

      mat-icon {
        color: rgba(0, 0, 0, 0.6);
      }
    `,
  ],
  template: `
    <div class="container">
      <!-- Adaptation Constraints Panel. -->
      <mat-expansion-panel expanded="true">
        <mat-expansion-panel-header
          collapsedHeight="40px"
          expandedHeight="40px"
        >
          <mat-panel-title>Adaptation Constraints</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="expansion-panel-body">
          <div
            *ngIf="!adaptationConstraints || !adaptationConstraints.length"
            class="not-found"
          >
            <mat-list>
              <mat-list-item>No Adaptation Constraints Found</mat-list-item>
            </mat-list>
          </div>
          <div *ngIf="adaptationConstraints && adaptationConstraints.length">
            <mat-list>
              <mat-divider></mat-divider>
              <mat-list-item
                *ngFor="let constraint of adaptationConstraints; let i = index"
              >
                <div class="constraint w-100">
                  <div class="left">
                    {{ constraint.name }}
                  </div>
                  <div class="right">
                    <button
                      matTooltip="Edit Constraint"
                      mat-icon-button
                      (click)="edit.emit(constraint)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      matTooltip="Delete Constraint"
                      mat-icon-button
                      (click)="delete.emit(constraint)"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                  <mat-divider></mat-divider>
                </div>
              </mat-list-item>
            </mat-list>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Plan Constraints Panel. -->
      <mat-expansion-panel expanded="true">
        <mat-expansion-panel-header
          collapsedHeight="40px"
          expandedHeight="40px"
        >
          <mat-panel-title>Plan Constraints</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="expansion-panel-body">
          <div *ngIf="!planConstraints || !planConstraints.length">
            <mat-list>
              <mat-list-item>No Plan Constraints Found</mat-list-item>
            </mat-list>
          </div>
          <div *ngIf="planConstraints && planConstraints.length">
            <mat-divider></mat-divider>
            <mat-list>
              <mat-list-item
                *ngFor="let constraint of planConstraints; let i = index"
              >
                <div class="constraint w-100">
                  <div class="left">
                    {{ constraint.name }}
                  </div>
                  <div class="right">
                    <button
                      matTooltip="Edit Constraint"
                      mat-icon-button
                      (click)="edit.emit(constraint)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      matTooltip="Delete Constraint"
                      mat-icon-button
                      (click)="delete.emit(constraint)"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
                <mat-divider></mat-divider>
              </mat-list-item>
            </mat-list>
          </div>
        </div>
      </mat-expansion-panel>
    </div>

    <footer>
      <button
        class="create-button"
        type="button"
        mat-raised-button
        (click)="create.emit()"
      >
        Create New Constraint
      </button>
    </footer>
  `,
})
export class ConstraintListComponent {
  @Input() adaptationConstraints: Constraint[] = [];
  @Input() planConstraints: Constraint[] = [];

  @Output() create: E<void> = new E();
  @Output() delete: E<Constraint> = new E();
  @Output() edit: E<Constraint> = new E();
}

@NgModule({
  declarations: [ConstraintListComponent],
  exports: [ConstraintListComponent],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
})
export class ConstraintListModule {}
