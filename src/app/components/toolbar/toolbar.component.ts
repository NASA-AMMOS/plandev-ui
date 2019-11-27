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
  selector: 'app-toolbar',
  styleUrls: ['./toolbar.component.css'],
  templateUrl: './toolbar.component.html',
})
export class ToolbarComponent implements OnChanges {
  @Input()
  height: number;

  constructor(private elRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.height) {
      this.elRef.nativeElement.style.setProperty(
        '--height',
        `${this.height}px`,
      );
    }
  }
}
