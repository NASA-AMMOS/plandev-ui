import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgModule,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MaterialModule } from '../../material';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-toolbar',
  styleUrls: ['./toolbar.component.css'],
  templateUrl: './toolbar.component.html',
})
export class ToolbarComponent implements OnChanges {
  @Input()
  height = 0;

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

@NgModule({
  declarations: [ToolbarComponent],
  exports: [ToolbarComponent],
  imports: [MaterialModule],
})
export class ToolbarModule {}
