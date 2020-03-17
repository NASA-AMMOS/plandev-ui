import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MaterialModule } from '../../material';
import { cActivityType, cActivityTypeMap } from '../../mocks';
import { CreateActivityInstanceFormComponent } from './create-activity-instance-form.component';

describe('CreateActivityInstanceFormComponent', () => {
  let comp: CreateActivityInstanceFormComponent;
  let fixture: ComponentFixture<CreateActivityInstanceFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreateActivityInstanceFormComponent],
      imports: [MaterialModule],
      providers: [FormBuilder],
    }).compileComponents();
    fixture = TestBed.createComponent(CreateActivityInstanceFormComponent);
    comp = fixture.componentInstance;
  });

  it('form should initially be invalid', () => {
    expect(comp.form.valid).toEqual(false);
  });

  it('form parameters getter should be properly defined', () => {
    expect(comp.formParameters).toBeDefined();
  });

  it('calling ngOnChanges with a selectedActivityType should properly set the form', () => {
    const newName = 'DevourBanana';
    comp.selectedActivityType = { ...cActivityType, name: newName };
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
    comp.selectedActivityType = { ...cActivityType };
    comp.activityTypes = [cActivityType];
    const change = {
      activityTypes: new SimpleChange(null, comp.activityTypes, true),
    };
    comp.ngOnChanges(change);
    expect(comp.selectedActivityType).toEqual(cActivityType);
  });

  it('setting valid activityTypesMap, startTimestamp, and type should give a valid form', () => {
    comp.activityTypesMap = { ...cActivityTypeMap };
    comp.form.controls.startTimestamp.setValue('2020-001T00:00:00');
    comp.form.controls.type.setValue('PeelBanana');
    expect(comp.form.valid).toEqual(true);
  });

  it('submitting an activity instance should emit a create Output event', () => {
    comp.activityTypesMap = { ...cActivityTypeMap };
    comp.form.controls.startTimestamp.setValue('2020-001T00:00:00');
    comp.form.controls.type.setValue('PeelBanana');
    comp.create.subscribe(activityInstance => {
      expect(activityInstance).toBeDefined();
    });
    comp.onSubmit();
  });
});
