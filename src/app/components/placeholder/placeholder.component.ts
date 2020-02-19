import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-placeholder',
  styles: [
    `
      :host {
        background-color: var(--color, #f2f2f2);
        display: block;
        height: var(--height, 200px);
        overflow: hidden;
        width: 100%;
      }
    `,
  ],
  template: '',
})
export class PlaceholderComponent implements OnChanges {
  @Input()
  color = '#000000';

  @Input()
  height = 0;

  constructor(private elRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.color) {
      this.elRef.nativeElement.style.setProperty('--color', `${this.color}`);
    }

    if (changes.height) {
      this.elRef.nativeElement.style.setProperty(
        '--height',
        `${this.height}px`,
      );
    }
  }
}

@NgModule({
  declarations: [PlaceholderComponent],
  exports: [PlaceholderComponent],
})
export class PlaceholderModule {}
