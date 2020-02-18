import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ngOnChanges } from 'src/app/functions';
import { MaterialModule } from 'src/app/material';
import { cActivityInstance, cActivityTypeMap } from 'src/app/mocks';
import { UpdateActivityInstanceFormComponent } from './update-activity-instance-form.component';

describe('UpdateActivityInstanceFormComponent', () => {
  let comp: UpdateActivityInstanceFormComponent;
  let fixture: ComponentFixture<UpdateActivityInstanceFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UpdateActivityInstanceFormComponent],
      imports: [MaterialModule],
      providers: [FormBuilder],
    }).compileComponents();
    fixture = TestBed.createComponent(UpdateActivityInstanceFormComponent);
    comp = fixture.componentInstance;
  });

  it('setting the activity instance should define the form', () => {
    expect(comp.form).toBeUndefined();
    ngOnChanges(comp, 'activityInstance', { ...cActivityInstance });
    expect(comp.form).toBeDefined();
  });

  it('getting a parameter value should return an empty string if the parameter is not defined', () => {
    expect(comp.getParameterValue(cActivityInstance, 'foo')).toEqual('');
  });

  it('setting the activity instance with defined activity types should make the form valid', () => {
    comp.activityTypesMap = { ...cActivityTypeMap };
    ngOnChanges(comp, 'activityInstance', { ...cActivityInstance });
    expect(comp.form.valid).toEqual(true);
  });

  it('calling onDelete should emit the delete Output event', () => {
    ngOnChanges(comp, 'activityInstance', { ...cActivityInstance });
    comp.delete.subscribe(id => {
      expect(id).toEqual(cActivityInstance.id);
    });
    comp.onDelete();
  });

  it('submitting an activity instance should emit the update Output event', () => {
    comp.activityTypesMap = { ...cActivityTypeMap };
    ngOnChanges(comp, 'activityInstance', { ...cActivityInstance });
    comp.update.subscribe(res => {
      expect(res).toBeDefined();
    });
    comp.onSubmit();
  });
});
