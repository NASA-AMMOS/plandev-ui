import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-panel-header',
  styles: [
    `
      :host {
        align-items: center;
        background-color: #b96102;
        color: white;
        display: inline-flex;
        height: 25px;
        justify-content: flex-start;
        overflow: hidden;
        padding: 0.25rem;
        position: sticky;
        top: 0px;
        white-space: nowrap;
        width: 100%;
        z-index: 1;
      }
    `,
  ],
  template: '<ng-content></ng-content>',
})
export class PanelHeaderComponent {}
