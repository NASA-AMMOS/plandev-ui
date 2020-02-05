export function ngOnChanges(comp: any, prop: string, value: any) {
  comp[prop] = value;
  comp.ngOnChanges({ [prop]: value });
}
