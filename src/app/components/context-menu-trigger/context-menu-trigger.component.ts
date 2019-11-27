import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-context-menu-trigger',
  styles: [
    `
      :host {
        left: var(--left, 0px);
        position: fixed;
        top: var(--top, 0px);
        visibility: hidden;
      }
    `,
  ],
  template: '',
})
export class ContextMenuTriggerComponent implements OnChanges {
  @Input()
  position: { x: number; y: number } = { x: 0, y: 0 };

  constructor(private elRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.position) {
      const { x, y } = this.position;
      this.elRef.nativeElement.style.setProperty('--left', `${x}px`);
      this.elRef.nativeElement.style.setProperty('--top', `${y}px`);
    }
  }
}
