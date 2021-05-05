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

      button {
        color: #ffffff;
        background: #0d1667;
        line-height: 24px;
        width: 176px;
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
      }

      mat-expansion-panel-header {
        border-radius: 0px;
        box-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2),
          0px 1px 1px 0px rgba(0, 0, 0, 0.14),
          0px 1px 3px 0px rgba(0, 0, 0, 0.12);
        font-family: Roboto;
        font-size: 16px;
        font-style: normal;
        font-weight: normal;
      }

      .expansion-panel-body-metadata,
      .expansion-panel-body-editor {
        padding-top: 10px;
      }

      .expansion-panel-metadata {
        margin-bottom: 20px;
      }

      .expansion-panel-body-editor {
        height: 55vh;
      }
    `,
  ],
  template: `
    <div class="container">
      <mat-expansion-panel class="expansion-panel-metadata" expanded="true">
        <mat-expansion-panel-header
          collapsedHeight="40px"
          expandedHeight="40px"
        >
          <mat-panel-title>Constraint Metadata</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="expansion-panel-body-metadata">
          <form class="p-1" [formGroup]="form">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Association</mat-label>
              <mat-select formControlName="association" [required]="true">
                <mat-option value="Adaptation">Adaptation</mat-option>
                <mat-option value="Plan">Plan</mat-option>
              </mat-select>
            </mat-form-field>

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
        </div>
      </mat-expansion-panel>

      <mat-expansion-panel expanded="true">
        <mat-expansion-panel-header
          collapsedHeight="40px"
          expandedHeight="40px"
        >
          <mat-panel-title>Constraint Definition</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="expansion-panel-body-editor">
          <code-mirror
            class="code-mirror"
            [text]="text"
            (textChanged)="onTextChanged($event)"
            (textValid)="definitionValid = $event"
          ></code-mirror>
        </div>
      </mat-expansion-panel>
    </div>

    <footer>
      <button
        type="button"
        mat-raised-button
        (click)="onSave()"
        [disabled]="!definitionValid || form.invalid"
      >
        Save
      </button>
    </footer>
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
      association: ['Adaptation', [Validators.required]],
      name: ['', [Validators.required]],
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.constraint) {
      if (this.constraint) {
        this.form.setValue({
          association: 'Adaptation',
          name: this.constraint.name,
        });
        this.text = JSON.stringify(
          JSON.parse(this.constraint.definition),
          null,
          2,
        );
        this.definition = this.text;
        this.definitionValid = true;
      } else {
        this.form.setValue({ association: 'Adaptation', name: '' });
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
