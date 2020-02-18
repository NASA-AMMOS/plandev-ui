import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { MaterialModule } from 'src/app/material';
import { cActivityTypeMap } from 'src/app/mocks';
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
