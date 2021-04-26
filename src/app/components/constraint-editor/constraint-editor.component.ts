import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  NgModule,
} from '@angular/core';
import { Constraint } from '../../types';
import { CodeMirrorModule } from '../code-mirror/code-mirror.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'constraint-editor',
  styles: [``],
  template: ` <code-mirror></code-mirror> `,
})
export class ConstraintEditorComponent {
  @Input() constraint: Constraint | null = null;
}

@NgModule({
  declarations: [ConstraintEditorComponent],
  exports: [ConstraintEditorComponent],
  imports: [CommonModule, CodeMirrorModule],
})
export class ConstraintEditorModule {}
