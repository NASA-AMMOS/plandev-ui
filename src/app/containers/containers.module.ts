import { NgModule } from '@angular/core';
import { AdaptationsModule } from './adaptations';
import { LoginModule } from './login';
import { PlanModule } from './plan';
import { PlansModule } from './plans';

const MODULES = [AdaptationsModule, LoginModule, PlanModule, PlansModule];

@NgModule({
  exports: MODULES,
  imports: MODULES,
})
export class ContainersModule {}
