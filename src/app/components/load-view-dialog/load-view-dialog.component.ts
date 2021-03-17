import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  NgModule,
  OnDestroy,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SubSink } from 'subsink';
import { MaterialModule } from '../../material';
import { ApiService } from '../../services';
import { User, View } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'load-view-dialog',
  styles: [
    `
      mat-icon {
        color: rgba(0, 0, 0, 0.6);
      }

      .header {
        align-items: center;
        display: flex;
      }

      .header-left {
        align-items: center;
        display: flex;
        flex-grow: 1;
      }
    `,
  ],
  template: `
    <h1 class="header" mat-dialog-title>
      <div class="header-left">Load View</div>
    </h1>

    <div mat-dialog-content class="h-100 pb-1">
      <div *ngIf="loading">Loading...</div>
      <div *ngIf="!loading">
        <div>
          <form class="p-1">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Filter Views</mat-label>
              <input matInput (input)="filterViews($event.target.value)" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </form>
        </div>
        <div *ngIf="filteredViews.length === 0">
          <mat-card> No Views Found </mat-card>
        </div>
        <table
          *ngIf="filteredViews.length > 0"
          [dataSource]="filteredViews"
          class="w-100 mat-elevation-z3"
          mat-table
        >
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let element">
              <button
                matTooltip="Load View"
                mat-icon-button
                (click)="loadView(element)"
              >
                <mat-icon>input</mat-icon>
              </button>
              <button
                *ngIf="element.meta.owner === data.user.name"
                matTooltip="Delete View. This cannot be undone."
                mat-icon-button
                (click)="deleteView(element)"
              >
                <mat-icon>delete_forever</mat-icon>
              </button>
            </td>
          </ng-container>
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Id</th>
            <td mat-cell *matCellDef="let element">
              {{ element.id }}
            </td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let element">
              {{ element.name }}
            </td>
          </ng-container>
          <ng-container matColumnDef="owner">
            <th mat-header-cell *matHeaderCellDef>Owner</th>
            <td mat-cell *matCellDef="let element">
              {{ element.meta.owner }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    </div>
  `,
})
export class LoadViewDialogComponent implements OnDestroy {
  displayedColumns: string[] = ['actions', 'id', 'name', 'owner'];
  filteredViews: View[] = [];
  loading = true;
  views: View[] = [];

  private subs = new SubSink();

  constructor(
    private apiService: ApiService,
    private cdRef: ChangeDetectorRef,
    private dialogRef: MatDialogRef<LoadViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User },
  ) {
    this.subs.add(
      this.apiService.getViews().subscribe(views => {
        this.views = views;
        this.filterViews();
        this.cdRef.markForCheck();
        this.loading = false;
      }),
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  deleteView(view: View) {
    this.dialogRef.close({ action: 'delete', view });
  }

  filterViews(input: string = '') {
    if (input === '') {
      this.filteredViews = this.views;
    } else {
      const lowerCaseInput = input.toLowerCase();
      this.filteredViews = this.views.filter(
        view =>
          view.name.toLowerCase().includes(lowerCaseInput) ||
          view.id.toLowerCase().includes(lowerCaseInput) ||
          view.meta.owner.toLowerCase().includes(lowerCaseInput),
      );
    }
  }

  loadView(view: View) {
    this.dialogRef.close({ action: 'load', view });
  }
}

@NgModule({
  declarations: [LoadViewDialogComponent],
  entryComponents: [LoadViewDialogComponent],
  exports: [LoadViewDialogComponent],
  imports: [CommonModule, MaterialModule],
})
export class LoadViewDialogModule {}
