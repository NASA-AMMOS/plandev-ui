import { NgModule } from '@angular/core';
import { AdaptationsModule } from './adaptations';
import { LoginModule } from './login';
import { NotFoundModule } from './not-found';
import { PlanModule } from './plan';
import { PlansModule } from './plans';

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
