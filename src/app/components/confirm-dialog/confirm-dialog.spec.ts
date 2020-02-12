import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent } from './confirm-dialog.component';

const MatDialogRefMock = {
  close() {},
};

describe('ConfirmDialogComponent', () => {
  let comp: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfirmDialogComponent],
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: MatDialogRefMock,
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    comp = fixture.componentInstance;
  });

  it('clicking onCancel should close the dialog', () => {
    const closeSpy = spyOn(MatDialogRefMock, 'close');
    comp.onCancel();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('clicking onConfirm should close the dialog', () => {
    const closeSpy = spyOn(MatDialogRefMock, 'close');
    comp.onConfirm();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
