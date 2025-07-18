export type GlobalType = {
  name: string;
  type: GlobalTypes;
};

export enum GlobalTypes {
  int = 'int',
  flt = 'flt',
  str = 'str',
  uint = 'uint',
}

export const globals: GlobalType[] = [
  { type: GlobalTypes.int, n: 64 },
  { type: GlobalTypes.flt, n: 64 },
  { type: GlobalTypes.str, n: 32 },
  { type: GlobalTypes.uint, n: 64 },
].flatMap(({type, n}) => Array.from({length: n}).map(i => {
  return {
    name: `G${String(i).padStart(2, '0')}${type.toString().toUpperCase()}`,
    type: type
  }
}))
