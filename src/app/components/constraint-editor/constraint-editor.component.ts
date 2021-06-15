import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import Ajv, { ValidateFunction } from 'ajv';
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

      mat-expansion-panel,
      mat-expansion-panel * {
        transition: none !important;
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
        margin-top: 10px;
      }

      .expansion-panel-metadata {
        margin-bottom: 20px;
      }

      .expansion-panel-body-editor {
        height: 55vh;
      }

      .schema-error {
        border: 1px solid #ff5454;
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
                <mat-option value="adaptation">Adaptation</mat-option>
                <mat-option value="plan">Plan</mat-option>
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

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Description</mat-label>
              <input
                autocomplete="off"
                formControlName="description"
                matInput
                type="text"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Summary</mat-label>
              <input
                autocomplete="off"
                formControlName="summary"
                matInput
                type="text"
              />
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

        <div
          class="expansion-panel-body-editor"
          [ngClass]="{
            'schema-error': !definitionValid
          }"
        >
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
export class ConstraintEditorComponent implements OnInit, OnChanges {
  @Input() constraint: Constraint | null = null;

  @Output() save: E<Constraint> = new E();

  ajv: Ajv;
  definition = '';
  definitionValid = true;
  form: FormGroup;
  validateSchema: ValidateFunction<any>;
  text = '';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      association: ['adaptation', [Validators.required]],
      description: [''],
      name: ['', [Validators.required]],
      summary: [''],
    });
  }

  async ngOnInit() {
    this.ajv = new Ajv();
    this.ajv.addKeyword('$anchor');
    const response = await fetch('assets/schemas/merlin-constraint.json');
    const merlinConstraintSchema = await response.json();
    this.validateSchema = this.ajv.compile<any>(merlinConstraintSchema);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.constraint) {
      if (this.constraint) {
        // Update.
        this.form.setValue({
          association: this.constraint.association,
          description: this.constraint.description,
          name: this.constraint.name,
          summary: this.constraint.summary,
        });
        this.text = JSON.stringify(
          JSON.parse(this.constraint.definition),
          null,
          2,
        );
        this.definition = this.text;
        this.definitionValid = true;
      } else {
        // New.
        this.form.setValue({
          association: 'adaptation',
          description: '',
          name: '',
          summary: '',
        });
        this.text = '';
      }
    }
  }

  onSave() {
    if (this.form.valid && this.definition !== '') {
      const { association, description, name, summary } = this.form.value;
      const constraint: Constraint = {
        association,
        definition: this.definition,
        description,
        name,
        summary,
      };
      this.save.emit(constraint);
    }
  }

  onTextChanged(json: JSON) {
    const valid = this.validateSchema(json);
    if (!valid) {
      console.log('Editor: Input is not a valid Merlin constraint.');
      console.log(this.validateSchema.errors);
    }
    this.definitionValid = valid;
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
