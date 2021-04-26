import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MaterialModule } from '../../material';
import { Constraint } from '../../types';
import { CodeMirrorModule } from '../code-mirror/code-mirror.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'constraint-editor',
  styles: [``],
  template: `
    <form class="p-1" [formGroup]="form">
      <div class="pb-3">
        <button
          type="button"
          mat-raised-button
          (click)="onSave()"
          [disabled]="!definitionValid || form.invalid"
        >
          Save
        </button>
      </div>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Name</mat-label>
        <input
          autocomplete="off"
          formControlName="name"
          matInput
          type="text"
          [required]="true"
        />
        <mat-error> A constraint name is required </mat-error>
      </mat-form-field>
    </form>
    <code-mirror
      [text]="text"
      (textChanged)="onTextChanged($event)"
      (textValid)="definitionValid = $event"
    ></code-mirror>
  `,
})
export class ConstraintEditorComponent implements OnChanges {
  @Input() constraint: Constraint | null = null;

  @Output() save: E<Constraint> = new E();

  definition = '';
  definitionValid = false;
  form: FormGroup;
  text = '';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.constraint) {
      if (this.constraint) {
        this.form.setValue({ name: this.constraint.name });
        this.text = JSON.stringify(
          JSON.parse(this.constraint.definition),
          null,
          2,
        );
        this.definition = this.text;
        this.definitionValid = true;
      } else {
        this.form.setValue({ name: '' });
        this.text = '';
      }
    }
  }

  onSave() {
    if (this.form.valid && this.definition !== '') {
      const { name } = this.form.value;
      const constraint: Constraint = {
        definition: this.definition,
        name,
      };
      this.save.emit(constraint);
    }
  }

  onTextChanged(json: JSON) {
    this.definition = JSON.stringify(json);
  }
}

@NgModule({
  declarations: [ConstraintEditorComponent],
  exports: [ConstraintEditorComponent],
  imports: [
    CodeMirrorModule,
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
  ],
})
export class ConstraintEditorModule {}
