import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { contextMenu } from 'src/app/functions';
import { MaterialModule } from '../../material';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'aerie-table',
  styleUrls: ['./table.component.css'],
  templateUrl: './table.component.html',
})
export class TableComponent implements OnChanges {
  @Input() columns: string[] = [];
  @Input() data: any[] = [];
  @Input() selectedElement: any | null = null;

  @Output() deleteElement: EventEmitter<string> = new EventEmitter();
  @Output() selectElement: EventEmitter<any> = new EventEmitter();

  columnsToDisplay: string[] = [...this.columns];
  onContextMenu = contextMenu;
  selection = new SelectionModel<any>(false, []);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.columns) {
      this.columnsToDisplay = [...this.columns];
    }

    if (changes.selectedElement) {
      this.selection.select(this.selectedElement);
    }
  }

  onSelectElement(element: any): void {
    this.selection.toggle(element);
    this.selectElement.emit(element);
  }
}

@NgModule({
  declarations: [TableComponent],
  exports: [TableComponent],
  imports: [CommonModule, MaterialModule],
})
export class TableModule {}
