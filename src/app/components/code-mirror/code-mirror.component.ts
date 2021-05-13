import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { basicSetup, EditorState, EditorView } from '@codemirror/basic-setup';
import { json } from '@codemirror/lang-json';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'code-mirror',
  template: ``,
})
export class CodeMirrorComponent implements AfterViewInit, OnChanges {
  @Input() text: string;

  @Output() textChanged: E<JSON> = new E();
  @Output() textValid: E<boolean> = new E();

  doc: string;
  editorView: EditorView;

  constructor(private elRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.text && this.editorView && this.text !== this.doc) {
      const { state } = this.editorView;
      const update = state.update({
        changes: {
          from: 0,
          insert: this.text,
          to: state.doc.length,
        },
      });
      this.editorView.update([update]);
    }
  }

  ngAfterViewInit() {
    const updateListener = EditorView.updateListener.of(update => {
      if (update.docChanged) {
        const doc = this.editorView.state.doc
          .toJSON()
          .join(this.editorView.state.lineBreak);
        this.doc = doc;
        try {
          const parsedDoc = JSON.parse(this.doc);
          this.textValid.emit(true);
          this.textChanged.emit(parsedDoc);
        } catch (error) {
          console.log('Editor: Input is not valid JSON.');
          this.textValid.emit(false);
        }
      }
    });
    const theme = EditorView.theme({
      '&.cm-editor': { height: '100%' },
      '&.cm-focused': { outline: '0px' },
    });

    this.editorView = new EditorView({
      parent: this.elRef.nativeElement,
      state: EditorState.create({
        doc: this.text || '',
        extensions: [basicSetup, updateListener, json(), theme],
      }),
    });
    this.doc = this.text;
  }
}

@NgModule({
  declarations: [CodeMirrorComponent],
  exports: [CodeMirrorComponent],
  imports: [CommonModule],
})
export class CodeMirrorModule {}
