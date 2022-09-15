type ModalElementValue<T = any> = {
  confirm: boolean;
  value?: T;
};

type ModalElementResolve = {
  resolve: (value: ModalElementValue | PromiseLike<ModalElementValue>) => void;
};

type ModalElement = HTMLDivElement & ModalElementResolve;
