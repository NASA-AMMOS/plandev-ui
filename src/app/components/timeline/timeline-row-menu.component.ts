import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  Output,
} from '@angular/core';
import { MaterialModule } from '../../material';
import { HorizontalGuide, Layer } from '../../types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-timeline-row-menu',
  styles: [
    `
      .menu {
        position: relative;
        left: calc(100% - 40px);
        z-index: 2;
      }

      .menu-icon {
        color: #c7c7c7;
      }
    `,
  ],
  template: `
    <div class="menu">
      <button
        #menuTrigger="matMenuTrigger"
        [matMenuTriggerFor]="rowMenu"
        mat-icon-button
      >
        <mat-icon class="menu-icon">more_horiz</mat-icon>
      </button>

      <mat-menu #rowMenu="matMenu">
        <button mat-menu-item [matMenuTriggerFor]="horizontalGuidesMenu">
          <mat-icon>horizontal_split</mat-icon>
          <span>Horizontal Guides</span>
        </button>
        <button mat-menu-item [matMenuTriggerFor]="layersMenu">
          <mat-icon>dynamic_feed</mat-icon>
          <span>Layers</span>
        </button>
      </mat-menu>

      <mat-menu #horizontalGuidesMenu="matMenu">
        <button mat-menu-item (click)="createHorizontalGuide.emit()">
          <mat-icon>add</mat-icon>
          <span>Create New</span>
        </button>
        <button mat-menu-item [matMenuTriggerFor]="horizontalGuidesEditMenu">
          <mat-icon>create</mat-icon>
          <span>Edit</span>
        </button>
        <button mat-menu-item [matMenuTriggerFor]="horizontalGuidesDeleteMenu">
          <mat-icon>delete_forever</mat-icon>
          <span>Delete</span>
        </button>
      </mat-menu>

      <mat-menu #horizontalGuidesEditMenu="matMenu">
        <ng-container *ngIf="!horizontalGuides?.length">
          <button mat-menu-item>No Horizontal Guides Found</button>
        </ng-container>
        <ng-container *ngIf="horizontalGuides?.length">
          <button
            *ngFor="let guide of horizontalGuides"
            mat-menu-item
            (click)="updateHorizontalGuide.emit(guide)"
          >
            <span>{{ guide.label.text }}</span>
          </button>
        </ng-container>
      </mat-menu>

      <mat-menu #horizontalGuidesDeleteMenu="matMenu">
        <ng-container *ngIf="!horizontalGuides?.length">
          <button mat-menu-item>No Horizontal Guides Found</button>
        </ng-container>
        <ng-container *ngIf="horizontalGuides?.length">
          <button
            *ngFor="let guide of horizontalGuides"
            mat-menu-item
            (click)="deleteHorizontalGuide.emit(guide)"
          >
            <span>{{ guide.label.text }}</span>
          </button>
        </ng-container>
      </mat-menu>

      <mat-menu #layersMenu="matMenu">
        <button mat-menu-item [matMenuTriggerFor]="layersEditMenu">
          <mat-icon>create</mat-icon>
          <span>Edit</span>
        </button>
      </mat-menu>

      <mat-menu #layersEditMenu="matMenu">
        <ng-container *ngIf="!layers?.length">
          <button mat-menu-item>No Layers Found</button>
        </ng-container>
        <ng-container *ngIf="layers?.length">
          <button
            *ngFor="let layer of layers; let i = index"
            mat-menu-item
            (click)="updateLayer.emit(layer)"
          >
            <span>Layer {{ i }}</span>
          </button>
        </ng-container>
      </mat-menu>
    </div>
  `,
})
export class TimelineRowMenuComponent {
  @Input()
  horizontalGuides: HorizontalGuide[] | undefined;

  @Input()
  layers: Layer[] | undefined;

  @Output()
  createHorizontalGuide: EventEmitter<void> = new EventEmitter();

  @Output()
  deleteHorizontalGuide: EventEmitter<HorizontalGuide> = new EventEmitter();

  @Output()
  updateHorizontalGuide: EventEmitter<HorizontalGuide> = new EventEmitter();

  @Output()
  updateLayer: EventEmitter<Layer> = new EventEmitter();
}

@NgModule({
  declarations: [TimelineRowMenuComponent],
  exports: [TimelineRowMenuComponent],
  imports: [CommonModule, MaterialModule],
})
export class TimelineRowMenuModule {}
