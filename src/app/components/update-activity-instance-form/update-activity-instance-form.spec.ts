import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ngOnChanges } from 'src/app/functions';
import { MaterialModule } from 'src/app/material';
import { activityInstance, activityTypes } from '../../mocks';
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
    ngOnChanges(comp, 'activityInstance', { ...activityInstance });
    expect(comp.form).toBeDefined();
  });

  it('getting a parameter value should return an empty string if the parameter is not defined', () => {
    expect(comp.getParameterValue(activityInstance, 'foo')).toEqual('');
  });

  it('setting the activity instance with defined activity types should make the form valid', () => {
    comp.activityTypes = activityTypes;
    ngOnChanges(comp, 'activityInstance', { ...activityInstance });
    expect(comp.form.valid).toEqual(true);
  });

  it('calling onDelete should emit the delete Output event', () => {
    ngOnChanges(comp, 'activityInstance', { ...activityInstance });
    comp.delete.subscribe(id => {
      expect(id).toEqual(activityInstance.id);
    });
    comp.onDelete();
  });

  it('submitting an activity instance should emit the update Output event', () => {
    comp.activityTypes = activityTypes;
    ngOnChanges(comp, 'activityInstance', { ...activityInstance });
    comp.update.subscribe(res => {
      expect(res).toBeDefined();
    });
    comp.onSubmit();
  });

  it('calling onSubmit with an invalid form should not emit an update', () => {
    const updateEmit = spyOn(comp.update, 'emit');
    comp.onSubmit();
    expect(updateEmit).not.toHaveBeenCalled();
  });

  it('calling ngOnChanges for an unknown component property should not do anything', () => {
    ngOnChanges(comp, 'foo', {});
    expect(comp).toBeDefined();
  });
});
