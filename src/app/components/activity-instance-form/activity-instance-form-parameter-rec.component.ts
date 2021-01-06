import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  SimpleChange,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import { ActivityInstanceFormParameter } from '../../types';
import { ActivityInstanceFormParameterRecSeriesComponent } from './activity-instance-form-parameter-rec-series.component';
import { ActivityInstanceFormParameterRecStructComponent } from './activity-instance-form-parameter-rec-struct.component';

type SeriesComponent = ActivityInstanceFormParameterRecSeriesComponent;
type StructComponent = ActivityInstanceFormParameterRecStructComponent;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-rec',
  template: ``,
})
export class ActivityInstanceFormParameterRecComponent
  implements OnChanges, OnDestroy {
  @Input()
  parameter: ActivityInstanceFormParameter | undefined;

  component: ComponentRef<SeriesComponent | StructComponent> | null = null;

  constructor(
    private cdRef: ChangeDetectorRef,
    private cfr: ComponentFactoryResolver,
    private vcr: ViewContainerRef,
  ) {}

  async ngOnChanges(changes: SimpleChanges) {
    if (changes.parameter && this.parameter) {
      await this.tryMount();
      this.trySetParameter(changes.parameter);
    }
  }

  ngOnDestroy() {
    this.component = null;
    this.vcr.clear();
  }

  async loadSeries() {
    const module = await import(
      `./activity-instance-form-parameter-rec-series.component`
    );
    return module;
  }

  async loadStruct() {
    const module = await import(
      `./activity-instance-form-parameter-rec-struct.component`
    );
    return module;
  }

  async tryMount() {
    if (this.component === null) {
      this.vcr.clear();
      if (this.parameter.schema.type === 'series') {
        const module = await this.loadSeries();
        const { ActivityInstanceFormParameterRecSeriesComponent: cmp } = module;
        const factory = this.cfr.resolveComponentFactory<SeriesComponent>(cmp);
        this.component = this.vcr.createComponent<SeriesComponent>(factory);
      } else if (this.parameter.schema.type === 'struct') {
        const module = await this.loadStruct();
        const { ActivityInstanceFormParameterRecStructComponent: cmp } = module;
        const factory = this.cfr.resolveComponentFactory<StructComponent>(cmp);
        this.component = this.vcr.createComponent<StructComponent>(factory);
      }
    }
  }

  trySetParameter(parameter: SimpleChange) {
    if (this.component && this.component.instance) {
      this.component.instance.parameter = this.parameter;
      this.component.instance.ngOnChanges({ parameter });
      this.cdRef.markForCheck();
    }
  }
}

@NgModule({
  declarations: [ActivityInstanceFormParameterRecComponent],
  exports: [ActivityInstanceFormParameterRecComponent],
})
export class ActivityInstanceFormParameterRecModule {}
