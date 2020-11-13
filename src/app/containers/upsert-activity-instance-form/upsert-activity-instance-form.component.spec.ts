import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormControl, FormGroup, NgForm } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ngOnChanges } from 'src/app/functions';
import { MaterialModule } from 'src/app/material';
import { activityInstance, activityType, activityTypes } from '../../mocks';
import { ApiMockService, ApiService } from '../../services';
import {
  ActivityInstanceFormStateMatcher,
  UpsertActivityInstanceFormComponent,
  UpsertActivityInstanceFormModule,
} from './upsert-activity-instance-form.component';

describe('UpsertActivityInstanceFormComponent', () => {
  let apiService: ApiService;
  let comp: UpsertActivityInstanceFormComponent;
  let fixture: ComponentFixture<UpsertActivityInstanceFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        UpsertActivityInstanceFormModule,
        MaterialModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: new ApiMockService(),
        },
        FormBuilder,
        provideMockStore({
          initialState: {
            planning: {
              selectedPlan: {
                adaptationId: '42',
              },
            },
          },
        }),
      ],
    }).compileComponents();
    apiService = TestBed.inject(ApiService);
    fixture = TestBed.createComponent(UpsertActivityInstanceFormComponent);
    comp = fixture.componentInstance;
  });

  describe('ActivityInstanceFormStateMatcher', () => {
    it('isErrorState should be false for an empty form control', () => {
      const matcher = new ActivityInstanceFormStateMatcher();
      const control = new FormControl();
      const res = matcher.isErrorState(control, null);
      expect(res).toEqual(false);
    });

    it('isErrorState should be true for an invalid submitted form', () => {
      const matcher = new ActivityInstanceFormStateMatcher();
      const control = new FormControl();
      control.setErrors({ invalid: true });
      const res = matcher.isErrorState(control, { submitted: true } as NgForm);
      expect(res).toEqual(true);
    });

    it('isErrorState should be true for an invalid dirty form', () => {
      const matcher = new ActivityInstanceFormStateMatcher();
      const control = new FormControl();
      control.setErrors({ invalid: true });
      control.markAsDirty();
      const res = matcher.isErrorState(control, null);
      expect(res).toEqual(true);
    });

    it('isErrorState should be true for an invalid touched form', () => {
      const matcher = new ActivityInstanceFormStateMatcher();
      const control = new FormControl();
      control.setErrors({ invalid: true });
      control.markAsTouched();
      const res = matcher.isErrorState(control, null);
      expect(res).toEqual(true);
    });
  });

  describe('create', () => {
    it('calling ngOnChanges with a selectedActivityType should properly set the form', () => {
      comp.type = 'create';
      const newName = 'DevourBanana';
      comp.selectedActivityType = { ...activityType, name: newName };
      const change = {
        selectedActivityType: new SimpleChange(
          null,
          comp.selectedActivityType,
          true,
        ),
      };
      comp.ngOnChanges(change);
      expect(comp.form.controls.type.value).toEqual(newName);
    });

    it('calling ngOnChanges with no selectedActivityType should not change the selectedActivityType', () => {
      comp.type = 'create';
      comp.selectedActivityType = { ...activityType };
      comp.activityTypes = activityTypes;
      const change = {
        activityTypes: new SimpleChange(null, comp.activityTypes, true),
      };
      comp.ngOnChanges(change);
      expect(comp.selectedActivityType).toEqual(activityType);
    });

    it('setting valid activityTypes, startTimestamp, and type should give a valid form', () => {
      comp.type = 'create';
      comp.activityTypes = activityTypes;
      comp.form.controls.startTimestamp.setValue('2020-001T00:00:00');
      comp.form.controls.type.setValue('PeelBanana');
      expect(comp.form.valid).toEqual(true);
    });

    it('submitting an activity instance should emit a create Output event', () => {
      comp.type = 'create';
      comp.activityTypes = activityTypes;
      comp.form.controls.startTimestamp.setValue('2020-001T00:00:00');
      comp.form.controls.type.setValue('PeelBanana');
      comp.create.subscribe(instance => {
        expect(instance).toBeDefined();
      });
      comp.onSubmit();
    });

    it('calling onSubmit with an invalid form should not emit a create', () => {
      comp.type = 'create';
      const createEmit = spyOn(comp.create, 'emit');
      comp.onSubmit();
      expect(createEmit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('setting the activity instance with defined activity types should make the form valid', () => {
      comp.type = 'update';
      comp.activityTypes = activityTypes;
      ngOnChanges(comp, 'activityInstance', { ...activityInstance });
      expect(comp.form.valid).toEqual(true);
    });

    it('submitting an activity instance should emit the update Output event', () => {
      comp.type = 'update';
      comp.activityTypes = activityTypes;
      ngOnChanges(comp, 'activityInstance', { ...activityInstance });
      comp.update.subscribe(res => {
        expect(res).toBeDefined();
      });
      comp.onSubmit();
    });

    it('calling onSubmit with an invalid form should not emit an update', () => {
      comp.type = 'update';
      const updateEmit = spyOn(comp.update, 'emit');
      comp.onSubmit();
      expect(updateEmit).not.toHaveBeenCalled();
    });
  });

  it('getting a parameter value should return an empty string if the parameter is not defined', () => {
    expect(comp.getParameterValue(activityInstance, 'foo')).toEqual('');
  });

  it('calling ngOnChanges for an unknown component property should not do anything', () => {
    ngOnChanges(comp, 'foo', {});
    expect(comp).toBeDefined();
  });

  it('input listener should set an error on the value control when next is called', () => {
    comp.activityTypes = activityTypes;
    ngOnChanges(comp, 'activityInstance', { ...activityInstance });
    const group = new FormGroup({
      name: new FormControl('peelDirection'),
      type: new FormControl('string'),
      value: new FormControl('fromTip'),
    });
    comp.inputListener.next(group);
    expect(group.controls.value.errors.invalid).toEqual('');
  });

  describe('reduceParameter', () => {
    it('real', () => {
      const parameter = { name: 'biteSize', type: 'real', value: '2.5' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe(2.5);
    });

    it('real - fail to parseFloat', () => {
      const parameter = { name: 'biteSize', type: 'real', value: 'a' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe('a');
    });

    it('int', () => {
      const parameter = { name: 'biteSize', type: 'int', value: '2' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe(2);
    });

    it('boolean - true', () => {
      const parameter = { name: 'canPeel', type: 'boolean', value: 'true' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe(true);
    });

    it('boolean - false', () => {
      const parameter = { name: 'canPeel', type: 'boolean', value: 'false' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe(false);
    });

    it('boolean - other', () => {
      const parameter = { name: 'canPeel', type: 'boolean', value: 'abc' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe('abc');
    });

    it('any', () => {
      const parameter = { name: 'peelDirection', type: 'string', value: '🙈' };
      const { value } = comp.reduceParameter(parameter);
      expect(value).toBe('🙈');
    });
  });

  describe('reduceParameters', () => {
    it('remove empty string valued parameters', () => {
      const parameters = [{ name: 'biteSize', type: 'real', value: '' }];
      const res = comp.reduceParameters(parameters);
      expect(res).toEqual([]);
    });

    it('map reduce parameters', () => {
      const parameters = [
        { name: 'biteSize', type: 'real', value: '2.5' },
        { name: 'fruitSize', type: 'int', value: '2' },
        { name: 'canPeel', type: 'boolean', value: 'false' },
        { name: 'bad', type: 'string', value: '' },
      ];
      const res = comp.reduceParameters(parameters);
      const expected = [
        { name: 'biteSize', value: 2.5 },
        { name: 'fruitSize', value: 2 },
        { name: 'canPeel', value: false },
      ];
      expect(res).toEqual(expected);
    });
  });

  describe('validateParameterValue', () => {
    it('succeeds', async () => {
      comp.type = 'update';
      ngOnChanges(comp, 'activityTypes', [...activityTypes]);
      ngOnChanges(comp, 'activityInstance', { ...activityInstance });
      spyOn(apiService, 'validateParameters').and.returnValue(
        of({
          errors: null,
          success: true,
        }),
      );
      const group = new FormGroup({
        name: new FormControl('peelDirection'),
        type: new FormControl('string'),
        value: new FormControl('fromTip'),
      });
      await comp.validateParameterValue(group);
      expect(group.controls.value.errors).toEqual(null);
    });

    it('fails', async () => {
      comp.type = 'update';
      ngOnChanges(comp, 'activityTypes', [...activityTypes]);
      ngOnChanges(comp, 'activityInstance', { ...activityInstance });
      const error = 'peelDirection must be fromStem or fromTip';
      spyOn(apiService, 'validateParameters').and.returnValue(
        of({
          errors: [error],
          success: false,
        }),
      );
      const group = new FormGroup({
        name: new FormControl('peelDirection'),
        type: new FormControl('string'),
        value: new FormControl('aroundSide'),
      });
      await comp.validateParameterValue(group);
      expect(group.controls.value.errors.invalid).toEqual(error);
    });
  });
});
