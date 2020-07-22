import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import {
  ConstraintViolationListNodeComponent,
  ConstraintViolationListNodeModule,
} from './constraint-violation-list-node.component';

describe('ConstraintViolationListNodeComponent', () => {
  let comp: ConstraintViolationListNodeComponent;
  let fixture: ComponentFixture<ConstraintViolationListNodeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConstraintViolationListNodeModule],
      providers: [
        provideMockStore({
          initialState: {},
        }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConstraintViolationListNodeComponent);
    comp = fixture.componentInstance;
  });

  it('', () => {
    // TODO.
    expect(true).toEqual(true);
  });
});
