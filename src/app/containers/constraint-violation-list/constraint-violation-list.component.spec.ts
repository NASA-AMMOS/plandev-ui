import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import {
  ConstraintViolationListComponent,
  ConstraintViolationListModule,
} from './constraint-violation-list.component';

describe('ConstraintViolationListComponent', () => {
  let comp: ConstraintViolationListComponent;
  let fixture: ComponentFixture<ConstraintViolationListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConstraintViolationListModule],
      providers: [
        provideMockStore({
          initialState: {},
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConstraintViolationListComponent);
    comp = fixture.componentInstance;
  });

  it('', () => {
    // TODO.
    expect(true).toEqual(true);
  });
});
