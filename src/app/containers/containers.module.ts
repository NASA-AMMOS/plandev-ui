import { NgModule } from '@angular/core';
import { AdaptationsModule } from './adaptations/adaptations.component';
import { LoginModule } from './login/login.component';
import { NotFoundModule } from './not-found/not-found.component';
import { PlanModule } from './plan/plan.component';
import { PlansModule } from './plans/plans.component';

const MODULES = [
  AdaptationsModule,
  LoginModule,
  NotFoundModule,
  PlanModule,
  PlansModule,
];

@NgModule({
  exports: MODULES,
  imports: MODULES,
})
export class ContainersModule {}
