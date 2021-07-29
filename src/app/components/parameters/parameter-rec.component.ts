import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  EventEmitter as E,
  Input,
  NgModule,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChange,
  SimpleChanges,
  ViewContainerRef,
} from '@angular/core';
import { SubSink } from 'subsink';
import { FormParameter, FormParameterChange } from '../../types';
import { ParameterRecSeriesComponent } from './parameter-rec-series.component';
import { ParameterRecStructComponent } from './parameter-rec-struct.component';

type SeriesComponent = ParameterRecSeriesComponent;
type StructComponent = ParameterRecStructComponent;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'parameter-rec',
  template: ``,
})
export class ParameterRecComponent implements OnChanges, OnDestroy {
  @Input() parameter: FormParameter | undefined;

  @Output() parameterChange: E<FormParameterChange> = new E();

  component: ComponentRef<SeriesComponent | StructComponent> | null = null;
  subs = new SubSink();

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
    this.subs.unsubscribe();
    this.vcr.clear();
  }

  async loadSeries() {
    const module = await import(`./parameter-rec-series.component`);
    return module;
  }

  async loadStruct() {
    const module = await import(`./parameter-rec-struct.component`);
    return module;
  }

  async tryMount() {
    if (this.component === null) {
      this.vcr.clear();

      if (this.parameter.schema.type === 'series') {
        const module = await this.loadSeries();
        const { ParameterRecSeriesComponent: cmp } = module;
        const factory = this.cfr.resolveComponentFactory<SeriesComponent>(cmp);
        this.component = this.vcr.createComponent<SeriesComponent>(factory);
      } else if (this.parameter.schema.type === 'struct') {
        const module = await this.loadStruct();
        const { ParameterRecStructComponent: cmp } = module;
        const factory = this.cfr.resolveComponentFactory<StructComponent>(cmp);
        this.component = this.vcr.createComponent<StructComponent>(factory);
      }

      if (this.component && this.component.instance) {
        this.subs.add(
          this.component.instance.parameterChange.subscribe(
            (change: FormParameterChange) => {
              this.parameterChange.emit(change);
            },
          ),
        );
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
  declarations: [ParameterRecComponent],
  exports: [ParameterRecComponent],
})
export class ParameterRecModule {}
